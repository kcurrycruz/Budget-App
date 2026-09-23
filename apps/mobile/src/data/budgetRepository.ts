import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import type { Account, Category, CategoryDraft, ManualTransactionDraft, MerchantRule, PlannedExpense, PlannedExpenseDraft, RecurringBill, RecurringBillDraft, Transaction } from '../types';
import { formatActivityDate, toDateOnly } from '../utils/date';

export type CloudBudgetData = {
  accounts: Account[];
  bills: number;
  categories: Category[];
  income: number;
  merchantRules: MerchantRule[];
  plannedExpenses: PlannedExpense[];
  previousMonthToDateSpent: number;
  recurringBills: RecurringBill[];
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
  connection_status: string;
  plaid_item_id: string | null;
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
  source: 'manual' | 'plaid';
  note: string | null;
  subcategory_id: string | null;
};

type SubcategoryRow = {
  id: string;
  category_id: string;
  name: string;
};

type RecurringBillRow = {
  id: string;
  name: string;
  amount: number | string;
  due_day: number;
  category_id: string | null;
};

type RecurringBillPaymentRow = {
  recurring_bill_id: string;
  paid_at: string;
};

type MerchantRuleRow = {
  id: string;
  merchant_name: string;
  category_id: string;
  subcategory_id: string | null;
};

type PlannedExpenseRow = {
  id: string;
  name: string;
  amount: number | string;
  target_month: string;
  category_id: string | null;
  covered_at: string | null;
};

const mapMerchantRule = (rule: MerchantRuleRow): MerchantRule => ({
  id: rule.id,
  merchantName: rule.merchant_name,
  categoryId: rule.category_id,
  subcategoryId: rule.subcategory_id ?? undefined,
});

const mapPlannedExpense = (expense: PlannedExpenseRow): PlannedExpense => ({
  id: expense.id,
  name: expense.name,
  amount: Number(expense.amount),
  targetMonth: expense.target_month,
  categoryId: expense.category_id ?? undefined,
  covered: Boolean(expense.covered_at),
  coveredAt: expense.covered_at ?? undefined,
});

const getMonthBounds = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const previousEnd = new Date(
    previousStart.getFullYear(),
    previousStart.getMonth(),
    Math.min(now.getDate(), previousLastDay) + 1,
  );
  return {
    start: toDateOnly(start),
    end: toDateOnly(end),
    previousStart: toDateOnly(previousStart),
    previousEnd: toDateOnly(previousEnd),
  };
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
  const { start, end, previousStart, previousEnd } = getMonthBounds();

  const [monthResult, categoriesResult, subcategoriesResult, accountsResult, transactionsResult, previousTransactionsResult, billsResult, billPaymentsResult, merchantRulesResult, plannedExpensesResult] = await Promise.all([
    client.from('budget_months').select('expected_income, fixed_costs').eq('month', start).maybeSingle(),
    client.from('categories').select('id, name, color, icon, monthly_limit').is('archived_at', null).order('sort_order'),
    client.from('subcategories').select('id, category_id, name').is('archived_at', null).order('sort_order').order('name'),
    client.from('financial_accounts').select('id, display_name, institution_name, mask, account_type, current_balance, connection_status, plaid_item_id, last_synced_at').is('disconnected_at', null).order('created_at'),
    client.from('transactions').select('id, merchant_name, category_id, subcategory_id, financial_account_id, amount, direction, needs_review, transaction_date, pending, source, note').gte('transaction_date', start).lt('transaction_date', end).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }),
    client.from('transactions').select('amount, direction').gte('transaction_date', previousStart).lt('transaction_date', previousEnd),
    client.from('recurring_bills').select('id, name, amount, due_day, category_id').eq('active', true).order('due_day').order('name'),
    client.from('recurring_bill_payments').select('recurring_bill_id, paid_at').eq('month', start),
    client.from('merchant_rules').select('id, merchant_name, category_id, subcategory_id').eq('active', true).order('merchant_name'),
    client.from('planned_expenses').select('id, name, amount, target_month, category_id, covered_at').order('target_month').order('name'),
  ]);

  const error = monthResult.error ?? categoriesResult.error ?? subcategoriesResult.error ?? accountsResult.error ?? transactionsResult.error ?? previousTransactionsResult.error
    ?? billsResult.error ?? billPaymentsResult.error ?? merchantRulesResult.error ?? plannedExpensesResult.error;
  if (error) throw error;

  const categoryRows = (categoriesResult.data ?? []) as CategoryRow[];
  const subcategoryRows = (subcategoriesResult.data ?? []) as SubcategoryRow[];
  const accountRows = (accountsResult.data ?? []) as AccountRow[];
  const transactionRows = (transactionsResult.data ?? []) as TransactionRow[];
  const previousTransactionRows = (previousTransactionsResult.data ?? []) as Pick<TransactionRow, 'amount' | 'direction'>[];
  const recurringBillRows = (billsResult.data ?? []) as RecurringBillRow[];
  const paymentRows = (billPaymentsResult.data ?? []) as RecurringBillPaymentRow[];
  const merchantRuleRows = (merchantRulesResult.data ?? []) as MerchantRuleRow[];
  const plannedExpenseRows = (plannedExpensesResult.data ?? []) as PlannedExpenseRow[];
  const billPayments = new Map(paymentRows.map((payment) => [payment.recurring_bill_id, payment.paid_at]));
  const accountNames = new Map(accountRows.map((account) => [account.id, account.display_name]));
  const spending = new Map<string, number>();
  const subcategoriesByCategory = new Map<string, SubcategoryRow[]>();

  for (const subcategory of subcategoryRows) {
    subcategoriesByCategory.set(subcategory.category_id, [...(subcategoriesByCategory.get(subcategory.category_id) ?? []), subcategory]);
  }

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
    subcategories: (subcategoriesByCategory.get(category.id) ?? []).map((subcategory) => ({
      id: subcategory.id,
      categoryId: subcategory.category_id,
      name: subcategory.name,
    })),
  }));

  const accounts: Account[] = accountRows.map((account) => ({
    id: account.id,
    name: account.display_name,
    institution: account.institution_name ?? 'Connected account',
    mask: account.mask ?? '—',
    balance: Number(account.current_balance ?? 0),
    connectionId: account.plaid_item_id ?? undefined,
    connectionStatus: account.connection_status === 'attention' ? 'attention' : 'healthy',
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
    source: transaction.source,
    note: transaction.note ?? undefined,
    subcategoryId: transaction.subcategory_id ?? undefined,
    transactionDate: transaction.transaction_date,
  }));

  const recurringBills: RecurringBill[] = recurringBillRows.map((bill) => ({
    id: bill.id,
    name: bill.name,
    amount: Number(bill.amount),
    dueDay: bill.due_day,
    categoryId: bill.category_id ?? undefined,
    paid: billPayments.has(bill.id),
    paidAt: billPayments.get(bill.id),
  }));
  const previousMonthToDateSpent = previousTransactionRows
    .filter((transaction) => transaction.direction === 'outflow')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return {
    accounts,
    bills: Number(monthResult.data?.fixed_costs ?? 0),
    categories,
    income: Number(monthResult.data?.expected_income ?? 0),
    merchantRules: merchantRuleRows.map(mapMerchantRule),
    plannedExpenses: plannedExpenseRows.map(mapPlannedExpense),
    previousMonthToDateSpent,
    recurringBills,
    transactions,
  };
}

export async function loadMerchantRules() {
  const client = requireClient();
  const { data, error } = await client
    .from('merchant_rules')
    .select('id, merchant_name, category_id, subcategory_id')
    .eq('active', true)
    .order('merchant_name');
  if (error) throw error;
  return ((data ?? []) as MerchantRuleRow[]).map(mapMerchantRule);
}

export async function deleteMerchantRule(ruleId: string) {
  const client = requireClient();
  const { data, error } = await client.from('merchant_rules').delete().eq('id', ruleId).select('id').single();
  if (error) throw error;
  if (!data?.id) throw new Error('The merchant rule could not be removed.');
}

export async function createPlannedExpense(draft: PlannedExpenseDraft) {
  const client = requireClient();
  const { data, error } = await client
    .from('planned_expenses')
    .insert({
      name: draft.name,
      amount: draft.amount,
      target_month: draft.targetMonth,
      category_id: draft.categoryId || null,
    })
    .select('id, name, amount, target_month, category_id, covered_at')
    .single();
  if (error) throw error;
  return mapPlannedExpense(data as PlannedExpenseRow);
}

export async function updatePlannedExpense(expenseId: string, draft: PlannedExpenseDraft) {
  const client = requireClient();
  const { data, error } = await client
    .from('planned_expenses')
    .update({
      name: draft.name,
      amount: draft.amount,
      target_month: draft.targetMonth,
      category_id: draft.categoryId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId)
    .select('id, name, amount, target_month, category_id, covered_at')
    .single();
  if (error) throw error;
  return mapPlannedExpense(data as PlannedExpenseRow);
}

export async function setPlannedExpenseCovered(expenseId: string, covered: boolean) {
  const client = requireClient();
  const { data, error } = await client
    .from('planned_expenses')
    .update({ covered_at: covered ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('id', expenseId)
    .select('id, name, amount, target_month, category_id, covered_at')
    .single();
  if (error) throw error;
  return mapPlannedExpense(data as PlannedExpenseRow);
}

export async function deletePlannedExpense(expenseId: string) {
  const client = requireClient();
  const { data, error } = await client.from('planned_expenses').delete().eq('id', expenseId).select('id').single();
  if (error) throw error;
  if (!data?.id) throw new Error('The planned expense could not be deleted.');
}

export async function createRecurringBill(draft: RecurringBillDraft) {
  const client = requireClient();
  const { data, error } = await client
    .from('recurring_bills')
    .insert({
      name: draft.name,
      amount: draft.amount,
      due_day: draft.dueDay,
      category_id: draft.categoryId || null,
    })
    .select('id, name, amount, due_day, category_id')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    amount: Number(data.amount),
    dueDay: data.due_day,
    categoryId: data.category_id ?? undefined,
    paid: false,
  } satisfies RecurringBill;
}

export async function updateRecurringBill(billId: string, draft: RecurringBillDraft) {
  const client = requireClient();
  const { data, error } = await client
    .from('recurring_bills')
    .update({
      name: draft.name,
      amount: draft.amount,
      due_day: draft.dueDay,
      category_id: draft.categoryId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', billId)
    .select('id, name, amount, due_day, category_id')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    amount: Number(data.amount),
    dueDay: data.due_day,
    categoryId: data.category_id ?? undefined,
  };
}

export async function deleteRecurringBill(billId: string) {
  const client = requireClient();
  const { data, error } = await client.from('recurring_bills').delete().eq('id', billId).select('id').single();
  if (error) throw error;
  if (!data?.id) throw new Error('The recurring bill could not be deleted.');
}

export async function setRecurringBillPaid(billId: string, paid: boolean) {
  const client = requireClient();
  const { start } = getMonthBounds();

  if (!paid) {
    const { error } = await client
      .from('recurring_bill_payments')
      .delete()
      .eq('recurring_bill_id', billId)
      .eq('month', start);
    if (error) throw error;
    return undefined;
  }

  const { data, error } = await client
    .from('recurring_bill_payments')
    .insert({ recurring_bill_id: billId, month: start })
    .select('paid_at')
    .single();
  if (error) throw error;
  return data.paid_at;
}

export async function createManualTransaction(draft: ManualTransactionDraft) {
  const client = requireClient();
  const { data, error } = await client
    .from('transactions')
    .insert({
      merchant_name: draft.merchant,
      amount: draft.amount,
      direction: draft.direction,
      category_id: draft.direction === 'outflow' ? draft.categoryId : null,
      subcategory_id: draft.direction === 'outflow' ? draft.subcategoryId || null : null,
      transaction_date: draft.transactionDate,
      source: 'manual',
      note: draft.note || null,
    })
    .select('id, merchant_name, category_id, subcategory_id, amount, direction, needs_review, transaction_date, pending, source, note')
    .single();

  if (error) throw error;

  return {
    id: data.id as string,
    merchant: data.merchant_name as string,
    categoryId: (data.category_id as string | null) ?? '',
    amount: Number(data.amount),
    direction: data.direction as 'outflow' | 'inflow',
    needsReview: Boolean(data.needs_review),
    date: formatActivityDate(data.transaction_date as string),
    account: 'Manual entry',
    pending: Boolean(data.pending),
    source: data.source as 'manual',
    note: (data.note as string | null) ?? undefined,
    subcategoryId: (data.subcategory_id as string | null) ?? undefined,
    transactionDate: data.transaction_date as string,
  } satisfies Transaction;
}

export async function updateManualTransaction(transactionId: string, draft: ManualTransactionDraft) {
  const client = requireClient();
  const { data, error } = await client
    .from('transactions')
    .update({
      merchant_name: draft.merchant,
      amount: draft.amount,
      direction: draft.direction,
      category_id: draft.direction === 'outflow' ? draft.categoryId : null,
      subcategory_id: draft.direction === 'outflow' ? draft.subcategoryId || null : null,
      transaction_date: draft.transactionDate,
      note: draft.note || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('source', 'manual')
    .select('id, merchant_name, category_id, subcategory_id, amount, direction, needs_review, transaction_date, pending, source, note')
    .single();

  if (error) throw error;

  return {
    id: data.id as string,
    merchant: data.merchant_name as string,
    categoryId: (data.category_id as string | null) ?? '',
    amount: Number(data.amount),
    direction: data.direction as 'outflow' | 'inflow',
    needsReview: Boolean(data.needs_review),
    date: formatActivityDate(data.transaction_date as string),
    account: 'Manual entry',
    pending: Boolean(data.pending),
    source: data.source as 'manual',
    note: (data.note as string | null) ?? undefined,
    subcategoryId: (data.subcategory_id as string | null) ?? undefined,
    transactionDate: data.transaction_date as string,
  } satisfies Transaction;
}

export async function deleteManualTransaction(transactionId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('source', 'manual')
    .select('id')
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error('The manual transaction could not be deleted.');
}

export async function categorizeTransaction(
  transactionId: string,
  categoryId: string,
  subcategoryId?: string,
  rememberMerchant = false,
) {
  const client = requireClient();
  const { error } = await client.rpc('categorize_transaction', {
    p_transaction_id: transactionId,
    p_category_id: categoryId,
    p_subcategory_id: subcategoryId || undefined,
    p_remember_merchant: rememberMerchant,
  });
  if (error) throw error;
}

export async function createCategory(draft: CategoryDraft, sortOrder: number) {
  const client = requireClient();
  const { data, error } = await client.from('categories').insert({
    name: draft.name,
    color: draft.color,
    icon: draft.icon,
    sort_order: sortOrder,
  }).select('id, name, color, icon, monthly_limit').single();
  if (error) throw error;
  return { id: data.id, name: data.name, color: data.color, icon: data.icon, spent: 0, budget: Number(data.monthly_limit), subcategories: [] } satisfies Category;
}

export async function updateCategory(categoryId: string, draft: CategoryDraft) {
  const client = requireClient();
  const { data, error } = await client.from('categories').update({
    name: draft.name,
    color: draft.color,
    icon: draft.icon,
    updated_at: new Date().toISOString(),
  }).eq('id', categoryId).select('id, name, color, icon').single();
  if (error) throw error;
  return data;
}

export async function createSubcategory(categoryId: string, name: string, sortOrder: number) {
  const client = requireClient();
  const { data, error } = await client.from('subcategories').insert({ category_id: categoryId, name, sort_order: sortOrder })
    .select('id, category_id, name').single();
  if (error) throw error;
  return { id: data.id, categoryId: data.category_id, name: data.name };
}

export async function updateSubcategory(subcategoryId: string, name: string) {
  const client = requireClient();
  const { data, error } = await client.from('subcategories').update({ name, updated_at: new Date().toISOString() })
    .eq('id', subcategoryId).select('id, category_id, name').single();
  if (error) throw error;
  return { id: data.id, categoryId: data.category_id, name: data.name };
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
  const [profileResult, monthsResult, categoriesResult, subcategoriesResult, accountsResult, transactionsResult, recurringBillsResult, recurringBillPaymentsResult, merchantRulesResult, plannedExpensesResult] = await Promise.all([
    client.from('profiles').select('full_name, created_at, updated_at').single(),
    client.from('budget_months').select('month, expected_income, fixed_costs, created_at, updated_at').order('month'),
    client.from('categories').select('name, color, icon, monthly_limit, sort_order, archived_at, created_at, updated_at').order('sort_order'),
    client.from('subcategories').select('name, category_id, sort_order, archived_at, created_at, updated_at').order('sort_order'),
    client.from('financial_accounts').select('display_name, institution_name, mask, account_type, current_balance, currency_code, last_synced_at, disconnected_at, created_at, updated_at').order('created_at'),
    client.from('transactions').select('merchant_name, amount, direction, needs_review, plaid_category_primary, plaid_category_detailed, transaction_date, pending, source, note, category_id, subcategory_id, financial_account_id, created_at, updated_at').order('transaction_date', { ascending: false }),
    client.from('recurring_bills').select('name, amount, due_day, category_id, active, created_at, updated_at').order('due_day'),
    client.from('recurring_bill_payments').select('recurring_bill_id, month, paid_at, created_at').order('month', { ascending: false }),
    client.from('merchant_rules').select('merchant_name, category_id, subcategory_id, active, created_at, updated_at').order('merchant_name'),
    client.from('planned_expenses').select('name, amount, target_month, category_id, covered_at, created_at, updated_at').order('target_month'),
  ]);

  const error = profileResult.error ?? monthsResult.error ?? categoriesResult.error ?? subcategoriesResult.error ?? accountsResult.error
    ?? transactionsResult.error ?? recurringBillsResult.error ?? recurringBillPaymentsResult.error ?? merchantRulesResult.error
    ?? plannedExpensesResult.error;
  if (error) throw error;

  return JSON.stringify({
    exported_at: new Date().toISOString(),
    profile: profileResult.data,
    monthly_plans: monthsResult.data,
    categories: categoriesResult.data,
    subcategories: subcategoriesResult.data,
    financial_accounts: accountsResult.data,
    merchant_rules: merchantRulesResult.data,
    planned_expenses: plannedExpensesResult.data,
    transactions: transactionsResult.data,
    recurring_bills: recurringBillsResult.data,
    recurring_bill_payments: recurringBillPaymentsResult.data,
  }, null, 2);
}

export async function createPlaidLinkToken(itemId?: string) {
  const data = await invokeFunction<{ linkToken: string }>('plaid-create-link-token', itemId ? { itemId } : {});
  if (!data?.linkToken) throw new Error('Plaid did not return a link token.');
  return data.linkToken;
}

export async function completePlaidUpdate(itemId: string) {
  return invokeFunction<{ repaired: boolean }>('plaid-complete-update', { itemId });
}

export async function disconnectPlaidItem(itemId: string) {
  return invokeFunction<{ disconnected: boolean; disconnectedAccounts: number }>('plaid-disconnect', { itemId });
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
