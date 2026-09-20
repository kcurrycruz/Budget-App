import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import type { Account, Category, Transaction } from '../types';

export type CloudBudgetData = {
  accounts: Account[];
  bills: number;
  categories: Category[];
  income: number;
  transactions: Transaction[];
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  icon: string;
  monthly_limit: number | string;
};

type AccountRow = {
  id: string;
  display_name: string;
  institution_name: string | null;
  mask: string | null;
  account_type: string;
  current_balance: number | string | null;
  last_synced_at: string | null;
};

type TransactionRow = {
  id: string;
  merchant_name: string;
  category_id: string | null;
  financial_account_id: string | null;
  amount: number | string;
  direction: 'outflow' | 'inflow';
  needs_review: boolean;
  transaction_date: string;
  pending: boolean;
};

const toDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthBounds = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: toDateOnly(start), end: toDateOnly(end) };
};

const formatActivityDate = (dateOnly: string) => {
  const [year, month, day] = dateOnly.split('-').map(Number);
  if (!year || !month || !day) return dateOnly;

  const date = new Date(year, month - 1, day);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const isSameDay = (left: Date, right: Date) => (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  );

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const requireClient = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

const invokeFunction = async <T>(name: string, body: Record<string, unknown> = {}) => {
  const client = requireClient();
  const { data, error } = await client.functions.invoke<T>(name, { body });
  if (!error) return data;

  let message = error.message;
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json() as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // Keep the SDK message when the response body is not JSON.
    }
  }
  throw new Error(message);
};

export async function loadCloudBudget(): Promise<CloudBudgetData> {
  const client = requireClient();
  const { start, end } = getMonthBounds();

  const [monthResult, categoriesResult, accountsResult, transactionsResult] = await Promise.all([
    client.from('budget_months').select('expected_income, fixed_costs').eq('month', start).maybeSingle(),
    client.from('categories').select('id, name, color, icon, monthly_limit').is('archived_at', null).order('sort_order'),
    client.from('financial_accounts').select('id, display_name, institution_name, mask, account_type, current_balance, last_synced_at').is('disconnected_at', null).order('created_at'),
    client.from('transactions').select('id, merchant_name, category_id, financial_account_id, amount, direction, needs_review, transaction_date, pending').gte('transaction_date', start).lt('transaction_date', end).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }),
  ]);

  const error = monthResult.error ?? categoriesResult.error ?? accountsResult.error ?? transactionsResult.error;
  if (error) throw error;

  const categoryRows = (categoriesResult.data ?? []) as CategoryRow[];
  const accountRows = (accountsResult.data ?? []) as AccountRow[];
  const transactionRows = (transactionsResult.data ?? []) as TransactionRow[];
  const accountNames = new Map(accountRows.map((account) => [account.id, account.display_name]));
  const spending = new Map<string, number>();

  for (const transaction of transactionRows) {
    if (!transaction.category_id || transaction.direction === 'inflow') continue;
    spending.set(transaction.category_id, (spending.get(transaction.category_id) ?? 0) + Number(transaction.amount));
  }

  const categories: Category[] = categoryRows.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    spent: spending.get(category.id) ?? 0,
    budget: Number(category.monthly_limit),
  }));

  const accounts: Account[] = accountRows.map((account) => ({
    id: account.id,
    name: account.display_name,
    institution: account.institution_name ?? 'Connected account',
    mask: account.mask ?? '—',
    balance: Number(account.current_balance ?? 0),
    type: ['checking', 'credit', 'savings', 'loan', 'investment', 'other'].includes(account.account_type)
      ? account.account_type as Account['type']
      : 'other',
    syncedAt: account.last_synced_at ? new Date(account.last_synced_at).toLocaleString() : 'Not synced yet',
  }));

  const transactions: Transaction[] = transactionRows.map((transaction) => ({
    id: transaction.id,
    merchant: transaction.merchant_name,
    categoryId: transaction.category_id ?? '',
    amount: Number(transaction.amount),
    direction: transaction.direction,
    needsReview: transaction.needs_review,
    date: formatActivityDate(transaction.transaction_date),
    account: transaction.financial_account_id ? accountNames.get(transaction.financial_account_id) ?? 'Connected account' : 'Manual entry',
    pending: transaction.pending,
  }));

  return {
    accounts,
    bills: Number(monthResult.data?.fixed_costs ?? 0),
    categories,
    income: Number(monthResult.data?.expected_income ?? 0),
    transactions,
  };
}

export async function createManualTransaction(draft: { merchant: string; amount: number; categoryId: string }) {
  const client = requireClient();
  const { data, error } = await client
    .from('transactions')
    .insert({
      merchant_name: draft.merchant,
      amount: draft.amount,
      direction: 'outflow',
      category_id: draft.categoryId,
      transaction_date: toDateOnly(new Date()),
      source: 'manual',
    })
    .select('id, merchant_name, category_id, amount, direction, needs_review, transaction_date, pending')
    .single();

  if (error) throw error;

  return {
    id: data.id as string,
    merchant: data.merchant_name as string,
    categoryId: data.category_id as string,
    amount: Number(data.amount),
    direction: data.direction as 'outflow' | 'inflow',
    needsReview: Boolean(data.needs_review),
    date: formatActivityDate(data.transaction_date as string),
    account: 'Manual entry',
    pending: Boolean(data.pending),
  } satisfies Transaction;
}

export async function saveMonthlyPlan(input: {
  bills: number;
  categories: Array<{ id: string; budget: number }>;
  income: number;
  userId: string;
}) {
  const client = requireClient();
  const { start } = getMonthBounds();
  const { error: monthError } = await client.from('budget_months').upsert(
    {
      user_id: input.userId,
      month: start,
      expected_income: input.income,
      fixed_costs: input.bills,
    },
    { onConflict: 'user_id,month' },
  );

  if (monthError) throw monthError;

  const categoryResults = await Promise.all(input.categories.map((category) => (
    client.from('categories').update({ monthly_limit: category.budget }).eq('id', category.id).eq('user_id', input.userId)
  )));
  const categoryError = categoryResults.find((result) => result.error)?.error;
  if (categoryError) throw categoryError;
}

export async function exportCloudBudget() {
  const client = requireClient();
  const [profileResult, monthsResult, categoriesResult, accountsResult, transactionsResult] = await Promise.all([
    client.from('profiles').select('full_name, created_at, updated_at').single(),
    client.from('budget_months').select('month, expected_income, fixed_costs, created_at, updated_at').order('month'),
    client.from('categories').select('name, color, icon, monthly_limit, sort_order, archived_at, created_at, updated_at').order('sort_order'),
    client.from('financial_accounts').select('display_name, institution_name, mask, account_type, current_balance, currency_code, last_synced_at, disconnected_at, created_at, updated_at').order('created_at'),
    client.from('transactions').select('merchant_name, amount, direction, needs_review, plaid_category_primary, plaid_category_detailed, transaction_date, pending, source, note, category_id, financial_account_id, created_at, updated_at').order('transaction_date', { ascending: false }),
  ]);

  const error = profileResult.error ?? monthsResult.error ?? categoriesResult.error ?? accountsResult.error ?? transactionsResult.error;
  if (error) throw error;

  return JSON.stringify({
    exported_at: new Date().toISOString(),
    profile: profileResult.data,
    monthly_plans: monthsResult.data,
    categories: categoriesResult.data,
    financial_accounts: accountsResult.data,
    transactions: transactionsResult.data,
  }, null, 2);
}

export async function createPlaidLinkToken() {
  const data = await invokeFunction<{ linkToken: string }>('plaid-create-link-token');
  if (!data?.linkToken) throw new Error('Plaid did not return a link token.');
  return data.linkToken;
}

export async function exchangePlaidPublicToken(publicToken: string, institutionName?: string | null) {
  return invokeFunction<{ accounts: number; connected: boolean }>('plaid-exchange-public-token', {
    publicToken,
    institutionName: institutionName ?? undefined,
  });
}

export async function syncPlaidAccounts() {
  return invokeFunction<{ syncedItems: number }>('plaid-sync');
}
