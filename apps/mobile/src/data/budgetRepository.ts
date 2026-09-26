import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import type { Account, Category, CategoryDraft, ImportedTransactionDraft, IncomeSuggestion, ManualTransactionDraft, MerchantRule, NetWorthSnapshot, PlannedExpense, PlannedExpenseContribution, PlannedExpenseDraft, RecurringBill, RecurringBillDraft, SavingsGoal, SavingsGoalContribution, SavingsGoalContributionDraft, SavingsGoalDraft, SpendingGroup, SubscriptionSuggestion, Transaction } from '../types';
import { currentMonthStart, formatActivityDate, parseDateOnly, plannedExpenseMonthlyAmount, shiftMonth, toDateOnly } from '../utils/date';
import { summarizeNetWorth } from '../utils/netWorth';
import { detectRecurringIncome, type IncomeHistoryRow } from '../utils/recurringIncome';

export type CloudBudgetData = {
  accounts: Account[];
  archivedCategories: Category[];
  bills: number;
  categories: Category[];
  income: number;
  incomeSuggestion?: IncomeSuggestion;
  merchantRules: MerchantRule[];
  netWorthHistory: NetWorthSnapshot[];
  plannedExpenses: PlannedExpense[];
  previousPlanAvailable: boolean;
  previousMonthToDateSpent: number;
  recurringBills: RecurringBill[];
  savingsGoals: SavingsGoal[];
  subscriptionSuggestions: SubscriptionSuggestion[];
  transactions: Transaction[];
};

type CategoryRow = {
  archived_at: string | null;
  id: string;
  name: string;
  color: string;
  icon: string;
  monthly_limit: number | string;
  sort_order: number;
  spending_group: SpendingGroup;
};

type CategoryMonthBudgetRow = {
  category_id: string;
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

type NetWorthSnapshotRow = {
  assets: number | string;
  debts: number | string;
  net_worth: number | string;
  snapshot_month: string;
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

type SubscriptionHistoryRow = Pick<TransactionRow, 'amount' | 'category_id' | 'merchant_name' | 'transaction_date'>;

type SubscriptionDismissalRow = {
  merchant_key: string;
};

type IncomeSuggestionResolutionRow = {
  suggestion_key: string;
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
  auto_fund: boolean;
  covered_at: string | null;
};

type PlannedExpenseContributionRow = {
  id: string;
  planned_expense_id: string;
  amount: number | string;
  contribution_month: string;
  created_at: string;
};

type SavingsGoalRow = {
  id: string;
  name: string;
  target_amount: number | string;
  current_amount: number | string;
  target_month: string;
};

type SavingsGoalContributionRow = {
  id: string;
  savings_goal_id: string;
  amount: number | string;
  note: string | null;
  contributed_on: string;
  created_at: string;
};

const mapMerchantRule = (rule: MerchantRuleRow): MerchantRule => ({
  id: rule.id,
  merchantName: rule.merchant_name,
  categoryId: rule.category_id,
  subcategoryId: rule.subcategory_id ?? undefined,
});

const mapPlannedExpenseContribution = (contribution: PlannedExpenseContributionRow): PlannedExpenseContribution => ({
  id: contribution.id,
  amount: Number(contribution.amount),
  contributionMonth: contribution.contribution_month,
  createdAt: contribution.created_at,
});

const mapPlannedExpense = (expense: PlannedExpenseRow, contributions: PlannedExpenseContribution[] = []): PlannedExpense => ({
  id: expense.id,
  name: expense.name,
  amount: Number(expense.amount),
  targetMonth: expense.target_month,
  categoryId: expense.category_id ?? undefined,
  autoFund: expense.auto_fund,
  contributions,
  savedAmount: contributions.reduce((sum, contribution) => sum + contribution.amount, 0),
  covered: Boolean(expense.covered_at),
  coveredAt: expense.covered_at ?? undefined,
});

const mapSavingsGoalContribution = (contribution: SavingsGoalContributionRow): SavingsGoalContribution => ({
  id: contribution.id,
  savingsGoalId: contribution.savings_goal_id,
  amount: Number(contribution.amount),
  note: contribution.note ?? undefined,
  contributedOn: contribution.contributed_on,
  createdAt: contribution.created_at,
});

const mapSavingsGoal = (goal: SavingsGoalRow, contributions: SavingsGoalContribution[] = []): SavingsGoal => ({
  id: goal.id,
  name: goal.name,
  targetAmount: Number(goal.target_amount),
  startingAmount: Number(goal.current_amount),
  currentAmount: Number(goal.current_amount) + contributions.reduce((sum, contribution) => sum + contribution.amount, 0),
  targetMonth: goal.target_month,
  contributions,
});

const normalizeMerchantKey = (value: string) => value
  .trim()
  .toLocaleLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .slice(0, 160);

const daysBetween = (left: string, right: string) => Math.round(
  (parseDateOnly(right).getTime() - parseDateOnly(left).getTime()) / 86_400_000,
);

const detectSubscriptionSuggestions = (
  transactions: SubscriptionHistoryRow[],
  recurringBills: RecurringBill[],
  dismissedKeys: Set<string>,
): SubscriptionSuggestion[] => {
  const existingBillKeys = new Set(recurringBills.map((bill) => normalizeMerchantKey(bill.name)));
  const groups = new Map<string, SubscriptionHistoryRow[]>();

  for (const transaction of transactions) {
    const merchantKey = normalizeMerchantKey(transaction.merchant_name);
    if (!merchantKey || dismissedKeys.has(merchantKey) || existingBillKeys.has(merchantKey)) continue;
    groups.set(merchantKey, [...(groups.get(merchantKey) ?? []), transaction]);
  }

  return [...groups.entries()].flatMap(([merchantKey, rows]) => {
    const sorted = [...rows].sort((left, right) => left.transaction_date.localeCompare(right.transaction_date));
    if (sorted.length < 2) return [];

    const newest = sorted.at(-1);
    if (!newest) return [];
    const chain: SubscriptionHistoryRow[] = [newest];
    for (let index = sorted.length - 2; index >= 0 && chain.length < 4; index -= 1) {
      const candidate = sorted[index];
      const nextCharge = chain[0];
      if (!candidate || !nextCharge) continue;
      const gap = daysBetween(candidate.transaction_date, nextCharge.transaction_date);
      if (gap >= 20 && gap <= 40) chain.unshift(candidate);
      else if (gap > 40) break;
    }
    if (chain.length < 2) return [];

    const average = chain.reduce((sum, row) => sum + Number(row.amount), 0) / chain.length;
    const tolerance = Math.max(2, average * 0.15);
    if (chain.some((row) => Math.abs(Number(row.amount) - average) > tolerance)) return [];

    const latest = chain.at(-1);
    if (!latest) return [];
    return [{
      merchantKey,
      merchantName: latest.merchant_name.trim(),
      amount: Math.round(average * 100) / 100,
      dueDay: parseDateOnly(latest.transaction_date).getDate(),
      categoryId: latest.category_id ?? undefined,
      occurrenceCount: chain.length,
    }];
  }).sort((left, right) => (
    right.occurrenceCount - left.occurrenceCount
    || right.amount - left.amount
    || left.merchantName.localeCompare(right.merchantName)
  )).slice(0, 3);
};

const getMonthBounds = (monthStart = currentMonthStart()) => {
  const now = new Date();
  const start = parseDateOnly(monthStart);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const previousStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
  const previousLastDay = new Date(start.getFullYear(), start.getMonth(), 0).getDate();
  const previousEnd = monthStart === currentMonthStart()
    ? new Date(previousStart.getFullYear(), previousStart.getMonth(), Math.min(now.getDate(), previousLastDay) + 1)
    : start;
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
      const payload = await error.context.json() as { error?: string; requestId?: string };
      if (payload.error) message = payload.requestId ? `${payload.error} (reference: ${payload.requestId})` : payload.error;
    } catch {
      // Keep the SDK message when the response body is not JSON.
    }
  }
  throw new Error(message);
};

export async function loadCloudBudget(monthStart = currentMonthStart()): Promise<CloudBudgetData> {
  const client = requireClient();
  const { start, end, previousStart, previousEnd } = getMonthBounds(monthStart);
  const historyStartDate = new Date();
  historyStartDate.setDate(historyStartDate.getDate() - 180);
  const historyStart = toDateOnly(historyStartDate);
  const incomeHistoryStartDate = new Date();
  incomeHistoryStartDate.setDate(incomeHistoryStartDate.getDate() - 365);
  const incomeHistoryStart = toDateOnly(incomeHistoryStartDate);

  const [monthResult, previousMonthResult, categoriesResult, categoryBudgetsResult, previousCategoryBudgetsResult, subcategoriesResult, accountsResult, transactionsResult, previousTransactionsResult, billsResult, billPaymentsResult, merchantRulesResult, plannedExpensesResult, plannedExpenseContributionsResult, savingsGoalsResult, savingsGoalContributionsResult, subscriptionHistoryResult, subscriptionDismissalsResult, incomeHistoryResult, incomeResolutionsResult] = await Promise.all([
    client.from('budget_months').select('expected_income, fixed_costs').eq('month', start).maybeSingle(),
    client.from('budget_months').select('expected_income, fixed_costs').eq('month', previousStart).maybeSingle(),
    client.from('categories').select('id, name, color, icon, monthly_limit, spending_group, sort_order, archived_at').order('sort_order').order('name'),
    client.from('category_month_budgets').select('category_id, monthly_limit').eq('month', start),
    client.from('category_month_budgets').select('monthly_limit').eq('month', previousStart),
    client.from('subcategories').select('id, category_id, name').is('archived_at', null).order('sort_order').order('name'),
    client.from('financial_accounts').select('id, display_name, institution_name, mask, account_type, current_balance, connection_status, plaid_item_id, last_synced_at').is('disconnected_at', null).order('created_at'),
    client.from('transactions').select('id, merchant_name, category_id, subcategory_id, financial_account_id, amount, direction, needs_review, transaction_date, pending, source, note').gte('transaction_date', start).lt('transaction_date', end).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }),
    client.from('transactions').select('amount, direction').gte('transaction_date', previousStart).lt('transaction_date', previousEnd),
    client.from('recurring_bills').select('id, name, amount, due_day, category_id').eq('active', true).order('due_day').order('name'),
    client.from('recurring_bill_payments').select('recurring_bill_id, paid_at').eq('month', start),
    client.from('merchant_rules').select('id, merchant_name, category_id, subcategory_id').eq('active', true).order('merchant_name'),
    client.from('planned_expenses').select('id, name, amount, target_month, category_id, auto_fund, covered_at').order('target_month').order('name'),
    client.from('planned_expense_contributions').select('id, planned_expense_id, amount, contribution_month, created_at').order('contribution_month').order('created_at'),
    client.from('savings_goals').select('id, name, target_amount, current_amount, target_month').order('target_month').order('name'),
    client.from('savings_goal_contributions').select('id, savings_goal_id, amount, note, contributed_on, created_at').lt('contributed_on', end).order('contributed_on', { ascending: false }).order('created_at', { ascending: false }),
    client.from('transactions').select('merchant_name, category_id, amount, transaction_date').eq('direction', 'outflow').eq('pending', false).gte('transaction_date', historyStart).order('transaction_date'),
    client.from('subscription_suggestion_dismissals').select('merchant_key'),
    client.from('transactions').select('merchant_name, amount, transaction_date, plaid_category_detailed').eq('direction', 'inflow').eq('pending', false).eq('source', 'plaid').eq('plaid_category_primary', 'INCOME').gte('transaction_date', incomeHistoryStart).order('transaction_date'),
    client.from('income_suggestion_resolutions').select('suggestion_key'),
  ]);

  const error = monthResult.error ?? previousMonthResult.error ?? categoriesResult.error ?? categoryBudgetsResult.error ?? previousCategoryBudgetsResult.error ?? subcategoriesResult.error ?? accountsResult.error ?? transactionsResult.error ?? previousTransactionsResult.error
    ?? billsResult.error ?? billPaymentsResult.error ?? merchantRulesResult.error ?? plannedExpensesResult.error ?? plannedExpenseContributionsResult.error ?? savingsGoalsResult.error ?? savingsGoalContributionsResult.error
    ?? subscriptionHistoryResult.error ?? subscriptionDismissalsResult.error ?? incomeHistoryResult.error ?? incomeResolutionsResult.error;
  if (error) throw error;

  const categoryRows = (categoriesResult.data ?? []) as CategoryRow[];
  const categoryBudgetRows = (categoryBudgetsResult.data ?? []) as CategoryMonthBudgetRow[];
  const subcategoryRows = (subcategoriesResult.data ?? []) as SubcategoryRow[];
  const accountRows = (accountsResult.data ?? []) as AccountRow[];
  const transactionRows = (transactionsResult.data ?? []) as TransactionRow[];
  const previousTransactionRows = (previousTransactionsResult.data ?? []) as Pick<TransactionRow, 'amount' | 'direction'>[];
  const recurringBillRows = (billsResult.data ?? []) as RecurringBillRow[];
  const paymentRows = (billPaymentsResult.data ?? []) as RecurringBillPaymentRow[];
  const merchantRuleRows = (merchantRulesResult.data ?? []) as MerchantRuleRow[];
  const plannedExpenseRows = (plannedExpensesResult.data ?? []) as PlannedExpenseRow[];
  let plannedExpenseContributionRows = (plannedExpenseContributionsResult.data ?? []) as PlannedExpenseContributionRow[];
  const savingsGoalRows = (savingsGoalsResult.data ?? []) as SavingsGoalRow[];
  const savingsGoalContributionRows = (savingsGoalContributionsResult.data ?? []) as SavingsGoalContributionRow[];
  const subscriptionHistoryRows = (subscriptionHistoryResult.data ?? []) as SubscriptionHistoryRow[];
  const subscriptionDismissalRows = (subscriptionDismissalsResult.data ?? []) as SubscriptionDismissalRow[];
  const incomeHistoryRows = (incomeHistoryResult.data ?? []) as IncomeHistoryRow[];
  const incomeResolutionRows = (incomeResolutionsResult.data ?? []) as IncomeSuggestionResolutionRow[];
  const billPayments = new Map(paymentRows.map((payment) => [payment.recurring_bill_id, payment.paid_at]));
  const accountNames = new Map(accountRows.map((account) => [account.id, account.display_name]));
  const spending = new Map<string, number>();
  const subcategoriesByCategory = new Map<string, SubcategoryRow[]>();
  const contributionsByGoal = new Map<string, SavingsGoalContribution[]>();
  const categoryBudgets = new Map(categoryBudgetRows.map((budget) => [budget.category_id, Number(budget.monthly_limit)]));

  for (const subcategory of subcategoryRows) {
    subcategoriesByCategory.set(subcategory.category_id, [...(subcategoriesByCategory.get(subcategory.category_id) ?? []), subcategory]);
  }

  for (const contributionRow of savingsGoalContributionRows) {
    const contribution = mapSavingsGoalContribution(contributionRow);
    contributionsByGoal.set(contribution.savingsGoalId, [
      ...(contributionsByGoal.get(contribution.savingsGoalId) ?? []),
      contribution,
    ]);
  }

  const automaticContributionMonth = currentMonthStart();
  const automaticContributions = plannedExpenseRows.flatMap((expense) => {
    if (!expense.auto_fund || expense.covered_at) return [];
    const contributions = plannedExpenseContributionRows.filter((contribution) => contribution.planned_expense_id === expense.id);
    if (contributions.some((contribution) => contribution.contribution_month === automaticContributionMonth)) return [];
    const savedAmount = contributions.reduce((sum, contribution) => sum + Number(contribution.amount), 0);
    const remainingAmount = Math.max(Number(expense.amount) - savedAmount, 0);
    if (remainingAmount <= 0) return [];
    const suggestedAmount = Math.round(plannedExpenseMonthlyAmount(
      remainingAmount,
      expense.target_month,
      automaticContributionMonth,
    ) * 100) / 100;
    return [{
      planned_expense_id: expense.id,
      contribution_month: automaticContributionMonth,
      amount: Math.min(remainingAmount, Math.max(0.01, suggestedAmount)),
    }];
  });

  if (automaticContributions.length > 0) {
    const { error: automaticContributionError } = await client
      .from('planned_expense_contributions')
      .upsert(automaticContributions, {
        ignoreDuplicates: true,
        onConflict: 'planned_expense_id,contribution_month',
      });
    if (automaticContributionError) throw automaticContributionError;

    const { data: refreshedContributions, error: refreshedContributionsError } = await client
      .from('planned_expense_contributions')
      .select('id, planned_expense_id, amount, contribution_month, created_at')
      .order('contribution_month')
      .order('created_at');
    if (refreshedContributionsError) throw refreshedContributionsError;
    plannedExpenseContributionRows = (refreshedContributions ?? []) as PlannedExpenseContributionRow[];
  }

  const contributionsByPlannedExpense = new Map<string, PlannedExpenseContribution[]>();
  for (const contributionRow of plannedExpenseContributionRows) {
    const contribution = mapPlannedExpenseContribution(contributionRow);
    contributionsByPlannedExpense.set(contributionRow.planned_expense_id, [
      ...(contributionsByPlannedExpense.get(contributionRow.planned_expense_id) ?? []),
      contribution,
    ]);
  }

  for (const transaction of transactionRows) {
    if (!transaction.category_id || transaction.direction === 'inflow') continue;
    spending.set(transaction.category_id, (spending.get(transaction.category_id) ?? 0) + Number(transaction.amount));
  }

  const allCategories = categoryRows.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    spendingGroup: category.spending_group,
    spent: spending.get(category.id) ?? 0,
    budget: categoryBudgets.get(category.id) ?? 0,
    subcategories: (subcategoriesByCategory.get(category.id) ?? []).map((subcategory) => ({
      id: subcategory.id,
      categoryId: subcategory.category_id,
      name: subcategory.name,
    })),
  }));
  const categories = allCategories.filter((_, index) => categoryRows[index]?.archived_at === null);
  const archivedCategories = allCategories.filter((_, index) => categoryRows[index]?.archived_at !== null);

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

  if (accounts.length > 0) {
    const { assets, debts } = summarizeNetWorth(accounts);
    const { error: snapshotError } = await client.from('net_worth_snapshots').upsert({
      snapshot_month: currentMonthStart(),
      assets,
      debts,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,snapshot_month' });
    if (snapshotError) throw snapshotError;
  }

  const { data: netWorthHistoryData, error: netWorthHistoryError } = await client
    .from('net_worth_snapshots')
    .select('snapshot_month, assets, debts, net_worth')
    .order('snapshot_month', { ascending: false })
    .limit(12);
  if (netWorthHistoryError) throw netWorthHistoryError;
  const netWorthHistory = ((netWorthHistoryData ?? []) as NetWorthSnapshotRow[])
    .map((snapshot) => ({
      assets: Number(snapshot.assets),
      debts: Number(snapshot.debts),
      netWorth: Number(snapshot.net_worth),
      snapshotMonth: snapshot.snapshot_month,
    }))
    .reverse();

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
  const previousPlanAvailable = Number(previousMonthResult.data?.expected_income ?? 0) > 0
    || Number(previousMonthResult.data?.fixed_costs ?? 0) > 0
    || (previousCategoryBudgetsResult.data ?? []).some((budget) => Number(budget.monthly_limit) > 0);

  return {
    accounts,
    archivedCategories,
    bills: Number(monthResult.data?.fixed_costs ?? 0),
    categories,
    income: Number(monthResult.data?.expected_income ?? 0),
    incomeSuggestion: detectRecurringIncome(
      incomeHistoryRows,
      new Set(incomeResolutionRows.map((resolution) => resolution.suggestion_key)),
    ),
    merchantRules: merchantRuleRows.map(mapMerchantRule),
    netWorthHistory,
    plannedExpenses: plannedExpenseRows.map((expense) => mapPlannedExpense(
      expense,
      contributionsByPlannedExpense.get(expense.id) ?? [],
    )),
    previousPlanAvailable,
    previousMonthToDateSpent,
    recurringBills,
    savingsGoals: savingsGoalRows.map((goal) => mapSavingsGoal(goal, contributionsByGoal.get(goal.id) ?? [])),
    subscriptionSuggestions: detectSubscriptionSuggestions(
      subscriptionHistoryRows,
      recurringBills,
      new Set(subscriptionDismissalRows.map((dismissal) => dismissal.merchant_key)),
    ),
    transactions,
  };
}

export async function dismissSubscriptionSuggestion(merchantKey: string) {
  const client = requireClient();
  const { error } = await client.from('subscription_suggestion_dismissals').insert({ merchant_key: merchantKey });
  if (error && error.code !== '23505') throw error;
}

export async function resolveIncomeSuggestion(
  sourceKeys: string[],
  resolution: 'accepted' | 'dismissed',
) {
  if (sourceKeys.length === 0) return;
  const client = requireClient();
  const { error } = await client.from('income_suggestion_resolutions').upsert(
    sourceKeys.map((suggestionKey) => ({
      suggestion_key: suggestionKey,
      resolution,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'user_id,suggestion_key' },
  );
  if (error) throw error;
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
      auto_fund: draft.autoFund,
    })
    .select('id, name, amount, target_month, category_id, auto_fund, covered_at')
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
      auto_fund: draft.autoFund,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId)
    .select('id, name, amount, target_month, category_id, auto_fund, covered_at')
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
    .select('id, name, amount, target_month, category_id, auto_fund, covered_at')
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

export async function createSavingsGoal(draft: SavingsGoalDraft) {
  const client = requireClient();
  const { data, error } = await client
    .from('savings_goals')
    .insert({
      name: draft.name,
      target_amount: draft.targetAmount,
      current_amount: draft.startingAmount,
      target_month: draft.targetMonth,
    })
    .select('id, name, target_amount, current_amount, target_month')
    .single();
  if (error) throw error;
  return mapSavingsGoal(data as SavingsGoalRow);
}

export async function updateSavingsGoal(goalId: string, draft: SavingsGoalDraft) {
  const client = requireClient();
  const [{ data, error }, contributionsResult] = await Promise.all([
    client
    .from('savings_goals')
    .update({
      name: draft.name,
      target_amount: draft.targetAmount,
      current_amount: draft.startingAmount,
      target_month: draft.targetMonth,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .select('id, name, target_amount, current_amount, target_month')
    .single(),
    client
      .from('savings_goal_contributions')
      .select('id, savings_goal_id, amount, note, contributed_on, created_at')
      .eq('savings_goal_id', goalId)
      .order('contributed_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);
  if (error) throw error;
  if (contributionsResult.error) throw contributionsResult.error;
  const contributions = ((contributionsResult.data ?? []) as SavingsGoalContributionRow[]).map(mapSavingsGoalContribution);
  return mapSavingsGoal(data as SavingsGoalRow, contributions);
}

export async function createSavingsGoalContribution(goalId: string, draft: SavingsGoalContributionDraft) {
  const client = requireClient();
  const { data, error } = await client
    .from('savings_goal_contributions')
    .insert({
      savings_goal_id: goalId,
      amount: draft.amount,
      note: draft.note.trim() || null,
      contributed_on: draft.contributedOn,
    })
    .select('id, savings_goal_id, amount, note, contributed_on, created_at')
    .single();
  if (error) throw error;
  return mapSavingsGoalContribution(data as SavingsGoalContributionRow);
}

export async function deleteSavingsGoalContribution(contributionId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('savings_goal_contributions')
    .delete()
    .eq('id', contributionId)
    .select('id')
    .single();
  if (error) throw error;
  if (!data?.id) throw new Error('The contribution could not be deleted.');
}

export async function deleteSavingsGoal(goalId: string) {
  const client = requireClient();
  const { data, error } = await client.from('savings_goals').delete().eq('id', goalId).select('id').single();
  if (error) throw error;
  if (!data?.id) throw new Error('The savings goal could not be deleted.');
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

export async function setRecurringBillPaid(billId: string, paid: boolean, monthStart = currentMonthStart()) {
  const client = requireClient();
  const { start } = getMonthBounds(monthStart);

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

export async function importManualTransactions(drafts: ImportedTransactionDraft[]) {
  if (!drafts.length) return [];
  const client = requireClient();
  const { data, error } = await client
    .from('transactions')
    .insert(drafts.map((draft) => ({
      amount: draft.amount,
      category_id: draft.direction === 'outflow' ? draft.categoryId || null : null,
      direction: draft.direction,
      merchant_name: draft.merchant,
      needs_review: draft.needsReview,
      note: draft.note || null,
      source: 'manual',
      subcategory_id: draft.direction === 'outflow' ? draft.subcategoryId || null : null,
      transaction_date: draft.transactionDate,
    })))
    .select('id, merchant_name, category_id, subcategory_id, amount, direction, needs_review, transaction_date, pending, source, note');

  if (error) throw error;

  return ((data ?? []) as TransactionRow[]).map((transaction) => ({
    id: transaction.id,
    merchant: transaction.merchant_name,
    categoryId: transaction.category_id ?? '',
    amount: Number(transaction.amount),
    direction: transaction.direction,
    needsReview: transaction.needs_review,
    date: formatActivityDate(transaction.transaction_date),
    account: 'Manual entry',
    pending: transaction.pending,
    source: transaction.source,
    note: transaction.note ?? undefined,
    subcategoryId: transaction.subcategory_id ?? undefined,
    transactionDate: transaction.transaction_date,
  } satisfies Transaction));
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
    spending_group: draft.spendingGroup,
    sort_order: sortOrder,
  }).select('id, name, color, icon, monthly_limit, spending_group').single();
  if (error) throw error;
  return { id: data.id, name: data.name, color: data.color, icon: data.icon, spendingGroup: data.spending_group as SpendingGroup, spent: 0, budget: Number(data.monthly_limit), subcategories: [] } satisfies Category;
}

export async function updateCategory(categoryId: string, draft: CategoryDraft) {
  const client = requireClient();
  const { data, error } = await client.from('categories').update({
    name: draft.name,
    color: draft.color,
    icon: draft.icon,
    spending_group: draft.spendingGroup,
    updated_at: new Date().toISOString(),
  }).eq('id', categoryId).select('id, name, color, icon, spending_group').single();
  if (error) throw error;
  return data;
}

export async function reorderCategories(categoryIds: string[]) {
  const client = requireClient();
  const updatedAt = new Date().toISOString();
  const results = await Promise.all(categoryIds.map((categoryId, index) => (
    client.from('categories')
      .update({ sort_order: (index + 1) * 10, updated_at: updatedAt })
      .eq('id', categoryId)
      .select('id')
      .single()
  )));
  const error = results.find((result) => result.error)?.error;
  if (error) throw error;
}

export async function archiveCategory(categoryId: string) {
  const client = requireClient();
  const timestamp = new Date().toISOString();
  const { data, error } = await client.from('categories')
    .update({ archived_at: timestamp, updated_at: timestamp })
    .eq('id', categoryId)
    .select('id')
    .single();
  if (error) throw error;
  if (!data?.id) throw new Error('The category could not be archived.');

  const { error: rulesError } = await client.from('merchant_rules')
    .update({ active: false, updated_at: timestamp })
    .eq('category_id', categoryId);
  if (rulesError) throw rulesError;
}

export async function restoreCategory(categoryId: string, sortOrder: number) {
  const client = requireClient();
  const { data, error } = await client.from('categories')
    .update({ archived_at: null, sort_order: sortOrder, updated_at: new Date().toISOString() })
    .eq('id', categoryId)
    .select('id')
    .single();
  if (error) throw error;
  if (!data?.id) throw new Error('The category could not be restored.');
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
  month: string;
  userId: string;
}) {
  const client = requireClient();
  const { start } = getMonthBounds(input.month);
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

  if (input.categories.length) {
    const { error: categoryError } = await client.from('category_month_budgets').upsert(
      input.categories.map((category) => ({
        category_id: category.id,
        month: start,
        monthly_limit: category.budget,
        user_id: input.userId,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id,category_id,month' },
    );
    if (categoryError) throw categoryError;
  }
}

export async function copyPreviousMonthPlan(input: { month: string; userId: string }) {
  const client = requireClient();
  const previousMonth = shiftMonth(input.month, -1);
  const [sourceMonthResult, sourceCategoriesResult, targetMonthResult, targetCategoriesResult] = await Promise.all([
    client.from('budget_months').select('expected_income, fixed_costs').eq('month', previousMonth).maybeSingle(),
    client.from('category_month_budgets').select('category_id, monthly_limit').eq('month', previousMonth),
    client.from('budget_months').select('expected_income, fixed_costs').eq('month', input.month).maybeSingle(),
    client.from('category_month_budgets').select('monthly_limit').eq('month', input.month),
  ]);
  const error = sourceMonthResult.error ?? sourceCategoriesResult.error ?? targetMonthResult.error ?? targetCategoriesResult.error;
  if (error) throw error;

  const targetHasPlan = Number(targetMonthResult.data?.expected_income ?? 0) > 0
    || Number(targetMonthResult.data?.fixed_costs ?? 0) > 0
    || (targetCategoriesResult.data ?? []).some((budget) => Number(budget.monthly_limit) > 0);
  if (targetHasPlan) throw new Error('This month already has a plan. Edit it instead of copying over it.');

  const sourceCategories = (sourceCategoriesResult.data ?? []) as CategoryMonthBudgetRow[];
  const income = Number(sourceMonthResult.data?.expected_income ?? 0);
  const bills = Number(sourceMonthResult.data?.fixed_costs ?? 0);
  if (income === 0 && bills === 0 && !sourceCategories.some((category) => Number(category.monthly_limit) > 0)) {
    throw new Error('There is no plan in the previous month to copy.');
  }

  const categories = sourceCategories.map((category) => ({
    id: category.category_id,
    budget: Number(category.monthly_limit),
  }));
  await saveMonthlyPlan({ bills, categories, income, month: input.month, userId: input.userId });
  return {
    bills,
    categoryBudgets: Object.fromEntries(categories.map((category) => [category.id, category.budget])),
    income,
  };
}

export async function exportCloudBudget() {
  const client = requireClient();
  const [profileResult, monthsResult, categoriesResult, categoryMonthBudgetsResult, subcategoriesResult, accountsResult, netWorthSnapshotsResult, transactionsResult, recurringBillsResult, recurringBillPaymentsResult, merchantRulesResult, plannedExpensesResult, plannedExpenseContributionsResult, savingsGoalsResult, savingsGoalContributionsResult, subscriptionDismissalsResult, incomeSuggestionResolutionsResult] = await Promise.all([
    client.from('profiles').select('full_name, created_at, updated_at').single(),
    client.from('budget_months').select('month, expected_income, fixed_costs, created_at, updated_at').order('month'),
    client.from('categories').select('name, color, icon, monthly_limit, spending_group, sort_order, archived_at, created_at, updated_at').order('sort_order'),
    client.from('category_month_budgets').select('category_id, month, monthly_limit, created_at, updated_at').order('month'),
    client.from('subcategories').select('name, category_id, sort_order, archived_at, created_at, updated_at').order('sort_order'),
    client.from('financial_accounts').select('display_name, institution_name, mask, account_type, current_balance, currency_code, last_synced_at, disconnected_at, created_at, updated_at').order('created_at'),
    client.from('net_worth_snapshots').select('snapshot_month, assets, debts, net_worth, created_at, updated_at').order('snapshot_month'),
    client.from('transactions').select('merchant_name, amount, direction, needs_review, plaid_category_primary, plaid_category_detailed, transaction_date, pending, source, note, category_id, subcategory_id, financial_account_id, created_at, updated_at').order('transaction_date', { ascending: false }),
    client.from('recurring_bills').select('name, amount, due_day, category_id, active, created_at, updated_at').order('due_day'),
    client.from('recurring_bill_payments').select('recurring_bill_id, month, paid_at, created_at').order('month', { ascending: false }),
    client.from('merchant_rules').select('merchant_name, category_id, subcategory_id, active, created_at, updated_at').order('merchant_name'),
    client.from('planned_expenses').select('name, amount, target_month, category_id, auto_fund, covered_at, created_at, updated_at').order('target_month'),
    client.from('planned_expense_contributions').select('planned_expense_id, amount, contribution_month, created_at').order('contribution_month', { ascending: false }),
    client.from('savings_goals').select('name, target_amount, current_amount, target_month, created_at, updated_at').order('target_month'),
    client.from('savings_goal_contributions').select('savings_goal_id, amount, note, contributed_on, created_at').order('contributed_on', { ascending: false }),
    client.from('subscription_suggestion_dismissals').select('merchant_key, created_at').order('created_at'),
    client.from('income_suggestion_resolutions').select('suggestion_key, resolution, created_at, updated_at').order('created_at'),
  ]);

  const error = profileResult.error ?? monthsResult.error ?? categoriesResult.error ?? categoryMonthBudgetsResult.error ?? subcategoriesResult.error ?? accountsResult.error ?? netWorthSnapshotsResult.error
    ?? transactionsResult.error ?? recurringBillsResult.error ?? recurringBillPaymentsResult.error ?? merchantRulesResult.error
    ?? plannedExpensesResult.error ?? plannedExpenseContributionsResult.error ?? savingsGoalsResult.error ?? savingsGoalContributionsResult.error ?? subscriptionDismissalsResult.error
    ?? incomeSuggestionResolutionsResult.error;
  if (error) throw error;

  return JSON.stringify({
    exported_at: new Date().toISOString(),
    profile: profileResult.data,
    monthly_plans: monthsResult.data,
    categories: categoriesResult.data,
    category_month_budgets: categoryMonthBudgetsResult.data,
    subcategories: subcategoriesResult.data,
    financial_accounts: accountsResult.data,
    net_worth_snapshots: netWorthSnapshotsResult.data,
    merchant_rules: merchantRulesResult.data,
    planned_expenses: plannedExpensesResult.data,
    planned_expense_contributions: plannedExpenseContributionsResult.data,
    savings_goals: savingsGoalsResult.data,
    savings_goal_contributions: savingsGoalContributionsResult.data,
    subscription_suggestion_dismissals: subscriptionDismissalsResult.data,
    income_suggestion_resolutions: incomeSuggestionResolutionsResult.data,
    transactions: transactionsResult.data,
    recurring_bills: recurringBillsResult.data,
    recurring_bill_payments: recurringBillPaymentsResult.data,
  }, null, 2);
}

export async function createPlaidLinkToken(itemId?: string) {
  const data = await invokeFunction<{ environment: 'sandbox' | 'development' | 'production'; expiration: string; linkToken: string }>('plaid-create-link-token', itemId ? { itemId } : {});
  if (!data?.linkToken) throw new Error('Plaid did not return a link token.');
  return data;
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
