import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';

import { PlaidApiError, plaidPost } from './plaid.ts';
import { resolvePlaidCategory, type PlaidPersonalFinanceCategory } from './plaidCategorization.ts';

type PlaidAccount = {
  account_id: string;
  balances: { available: number | null; current: number | null; iso_currency_code: string | null };
  mask: string | null;
  name: string;
  official_name: string | null;
  subtype: string | null;
  type: string;
};

type PlaidTransaction = {
  account_id: string;
  amount: number;
  date: string;
  merchant_name: string | null;
  name: string;
  pending: boolean;
  pending_transaction_id: string | null;
  personal_finance_category: PlaidPersonalFinanceCategory | null;
  transaction_id: string;
};

type SyncResponse = {
  added: PlaidTransaction[];
  has_more: boolean;
  modified: PlaidTransaction[];
  next_cursor: string;
  removed: Array<{ transaction_id: string }>;
};

type AccountsResponse = { accounts: PlaidAccount[] };

export type PlaidItemRow = {
  access_token_ciphertext: string;
  id: string;
  institution_name: string | null;
  user_id: string;
};

const chunks = <T>(values: T[], size = 200) => {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
};

const accountType = (account: PlaidAccount) => {
  if (account.type === 'credit') return 'credit';
  if (account.type === 'loan') return 'loan';
  if (account.type === 'investment' || account.type === 'brokerage') return 'investment';
  if (account.type === 'depository' && account.subtype === 'savings') return 'savings';
  if (account.type === 'depository') return 'checking';
  return 'other';
};

export async function upsertAccounts(
  admin: SupabaseClient,
  item: Pick<PlaidItemRow, 'id' | 'institution_name' | 'user_id'>,
  accounts: PlaidAccount[],
) {
  if (accounts.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await admin.from('financial_accounts').upsert(accounts.map((account) => ({
    user_id: item.user_id,
    plaid_item_id: item.id,
    plaid_account_id: account.account_id,
    display_name: account.official_name ?? account.name,
    institution_name: item.institution_name,
    mask: account.mask,
    account_type: accountType(account),
    current_balance: account.balances.current,
    available_balance: account.balances.available,
    currency_code: account.balances.iso_currency_code ?? 'USD',
    disconnected_at: null,
    updated_at: now,
  })), { onConflict: 'plaid_account_id' });
  if (error) throw error;
}
const merchantRuleKey = (merchant: string) => merchant.trim().toLowerCase().replace(/\s+/g, ' ');

export async function syncPlaidItem(
  admin: SupabaseClient,
  item: PlaidItemRow,
  accessToken: string,
) {
  const { data: state, error: stateError } = await admin
    .from('plaid_sync_state')
    .select('next_cursor')
    .eq('plaid_item_id', item.id)
    .maybeSingle();
  if (stateError) throw stateError;

  const startingCursor = typeof state?.next_cursor === 'string' ? state.next_cursor : undefined;
  let added: PlaidTransaction[] = [];
  let modified: PlaidTransaction[] = [];
  let removed: Array<{ transaction_id: string }> = [];
  let nextCursor = startingCursor;
  let page = 0;
  let restartCount = 0;

  while (true) {
    try {
      const response = await plaidPost<SyncResponse>('/transactions/sync', {
        access_token: accessToken,
        ...(nextCursor ? { cursor: nextCursor } : {}),
        count: 500,
        options: { personal_finance_category_version: 'v2' },
      });
      added.push(...response.added);
      modified.push(...response.modified);
      removed.push(...response.removed);
      nextCursor = response.next_cursor;
      page += 1;
      if (!response.has_more) break;
      if (page >= 20) throw new PlaidApiError('Plaid returned too many transaction pages.', 'PLAID_SYNC_LIMIT');
    } catch (caught) {
      if (caught instanceof PlaidApiError && caught.code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' && restartCount < 2) {
        added = [];
        modified = [];
        removed = [];
        nextCursor = startingCursor;
        page = 0;
        restartCount += 1;
        continue;
      }
      throw caught;
    }
  }

  const accountResponse = await plaidPost<AccountsResponse>('/accounts/get', { access_token: accessToken });
  await upsertAccounts(admin, item, accountResponse.accounts);

  const { data: accountRows, error: accountError } = await admin
    .from('financial_accounts')
    .select('id, plaid_account_id')
    .eq('user_id', item.user_id)
    .eq('plaid_item_id', item.id);
  if (accountError) throw accountError;
  const accountIds = new Map((accountRows ?? []).map((account) => [account.plaid_account_id as string, account.id as string]));

  const { data: categoryRows, error: categoryError } = await admin
    .from('categories')
    .select('id, name')
    .eq('user_id', item.user_id)
    .is('archived_at', null);
  if (categoryError) throw categoryError;

  const { data: subcategoryRows, error: subcategoryError } = await admin
    .from('subcategories')
    .select('id, category_id, name')
    .eq('user_id', item.user_id)
    .is('archived_at', null);
  if (subcategoryError) throw subcategoryError;

  const { data: merchantRuleRows, error: merchantRuleError } = await admin
    .from('merchant_rules')
    .select('merchant_key, category_id, subcategory_id')
    .eq('user_id', item.user_id)
    .eq('active', true);
  if (merchantRuleError) throw merchantRuleError;
  const merchantRules = new Map((merchantRuleRows ?? []).map((rule) => [rule.merchant_key as string, {
    categoryId: rule.category_id as string,
    subcategoryId: rule.subcategory_id as string | null,
  }]));

  const changed = [...added, ...modified];
  const existing = new Map<string, { category_id: string | null; needs_review: boolean; subcategory_id: string | null }>();
  const priorTransactionIds = changed
    .flatMap((transaction) => [transaction.transaction_id, transaction.pending_transaction_id])
    .filter((transactionId): transactionId is string => Boolean(transactionId));
  for (const batch of chunks([...new Set(priorTransactionIds)])) {
    if (batch.length === 0) continue;
    const { data, error } = await admin
      .from('transactions')
      .select('plaid_transaction_id, category_id, subcategory_id, needs_review')
      .eq('user_id', item.user_id)
      .in('plaid_transaction_id', batch);
    if (error) throw error;
    for (const row of data ?? []) {
      existing.set(row.plaid_transaction_id as string, {
        category_id: row.category_id as string | null,
        needs_review: Boolean(row.needs_review),
        subcategory_id: row.subcategory_id as string | null,
      });
    }
  }

  const now = new Date().toISOString();
  const records = changed.map((transaction) => {
    const previous = existing.get(transaction.transaction_id)
      ?? (transaction.pending_transaction_id ? existing.get(transaction.pending_transaction_id) : undefined);
    const primary = transaction.personal_finance_category?.primary;
    const direction = transaction.amount >= 0 ? 'outflow' : 'inflow';
    const merchantName = (transaction.merchant_name ?? transaction.name ?? 'Unknown transaction').slice(0, 160);
    const rule = direction === 'outflow' ? merchantRules.get(merchantRuleKey(merchantName)) : undefined;
    const keepReviewedCategory = previous && !previous.needs_review;
    const plaidCategory = direction === 'outflow'
      ? resolvePlaidCategory(
          transaction.personal_finance_category,
          (categoryRows ?? []).map((category) => ({ id: category.id as string, name: category.name as string })),
          (subcategoryRows ?? []).map((subcategory) => ({
            id: subcategory.id as string,
            category_id: subcategory.category_id as string,
            name: subcategory.name as string,
          })),
        )
      : { categoryId: null, confident: false, subcategoryId: null };
    const categoryId = keepReviewedCategory
      ? previous.category_id
      : rule?.categoryId ?? plaidCategory.categoryId ?? previous?.category_id ?? null;
    const subcategoryId = keepReviewedCategory
      ? previous.subcategory_id
      : rule?.subcategoryId ?? plaidCategory.subcategoryId ?? previous?.subcategory_id ?? null;
    return {
      user_id: item.user_id,
      financial_account_id: accountIds.get(transaction.account_id) ?? null,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      plaid_transaction_id: transaction.transaction_id,
      merchant_name: merchantName,
      amount: Math.abs(Number(transaction.amount)),
      direction,
      transaction_date: transaction.date,
      pending: transaction.pending,
      source: 'plaid',
      needs_review: direction === 'inflow'
        ? false
        : keepReviewedCategory || rule || (plaidCategory.confident && Boolean(categoryId))
          ? false
          : true,
      plaid_category_primary: primary ?? null,
      plaid_category_detailed: transaction.personal_finance_category?.detailed ?? null,
      updated_at: now,
    };
  });

  for (const batch of chunks(records)) {
    if (batch.length === 0) continue;
    const { error } = await admin.from('transactions').upsert(batch, { onConflict: 'plaid_transaction_id' });
    if (error) throw error;
  }

  const replacedPendingTransactionIds = changed
    .filter((transaction) => !transaction.pending && transaction.pending_transaction_id)
    .map((transaction) => transaction.pending_transaction_id as string);
  for (const batch of chunks([...new Set(replacedPendingTransactionIds)])) {
    if (batch.length === 0) continue;
    const { error } = await admin
      .from('transactions')
      .delete()
      .eq('user_id', item.user_id)
      .in('plaid_transaction_id', batch);
    if (error) throw error;
  }

  for (const batch of chunks(removed.map((transaction) => transaction.transaction_id))) {
    if (batch.length === 0) continue;
    const { error } = await admin
      .from('transactions')
      .delete()
      .eq('user_id', item.user_id)
      .in('plaid_transaction_id', batch);
    if (error) throw error;
  }

  const syncedAt = new Date().toISOString();
  const { error: updateError } = await admin.from('plaid_sync_state').upsert({
    plaid_item_id: item.id,
    next_cursor: nextCursor,
    last_synced_at: syncedAt,
    last_error: null,
    updated_at: syncedAt,
  }, { onConflict: 'plaid_item_id' });
  if (updateError) throw updateError;

  const { error: accountStatusError } = await admin.from('financial_accounts').update({
    connection_status: 'healthy',
    last_synced_at: syncedAt,
    updated_at: syncedAt,
  }).eq('plaid_item_id', item.id).eq('user_id', item.user_id);
  if (accountStatusError) throw accountStatusError;

  return { added: added.length, modified: modified.length, removed: removed.length };
}
