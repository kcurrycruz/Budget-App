export type SpendingGroup = 'needs' | 'wants' | 'savings';

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  spendingGroup: SpendingGroup;
  spent: number;
  budget: number;
  subcategories: Subcategory[];
};

export type Subcategory = {
  id: string;
  categoryId: string;
  name: string;
};

export type CategoryDraft = {
  name: string;
  color: string;
  icon: string;
  spendingGroup: SpendingGroup;
};

export type Transaction = {
  id: string;
  merchant: string;
  categoryId: string;
  subcategoryId?: string;
  amount: number;
  date: string;
  account: string;
  direction?: 'outflow' | 'inflow';
  needsReview?: boolean;
  note?: string;
  pending?: boolean;
  source?: 'manual' | 'plaid';
  transactionDate?: string;
};

export type ManualTransactionDraft = {
  amount: number;
  categoryId: string;
  subcategoryId?: string;
  direction: 'outflow' | 'inflow';
  merchant: string;
  note: string;
  transactionDate: string;
};

export type MerchantRule = {
  id: string;
  merchantName: string;
  categoryId: string;
  subcategoryId?: string;
};

export type PlannedExpense = {
  id: string;
  name: string;
  amount: number;
  targetMonth: string;
  categoryId?: string;
  covered: boolean;
  coveredAt?: string;
};

export type PlannedExpenseDraft = {
  name: string;
  amount: number;
  targetMonth: string;
  categoryId?: string;
};

export type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  startingAmount: number;
  currentAmount: number;
  targetMonth: string;
  contributions: SavingsGoalContribution[];
};

export type SavingsGoalDraft = {
  name: string;
  targetAmount: number;
  startingAmount: number;
  targetMonth: string;
};

export type SavingsGoalContribution = {
  id: string;
  savingsGoalId: string;
  amount: number;
  note?: string;
  contributedOn: string;
  createdAt: string;
};

export type SavingsGoalContributionDraft = {
  amount: number;
  note: string;
  contributedOn: string;
};

export type RecurringBill = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  categoryId?: string;
  paid: boolean;
  paidAt?: string;
};

export type RecurringBillDraft = {
  name: string;
  amount: number;
  dueDay: number;
  categoryId?: string;
};

export type Account = {
  id: string;
  name: string;
  institution: string;
  mask: string;
  balance: number;
  connectionId?: string;
  connectionStatus?: 'healthy' | 'attention';
  type: 'checking' | 'credit' | 'savings' | 'loan' | 'investment' | 'other';
  syncedAt: string;
};

export type AppTab = 'home' | 'transactions' | 'plan' | 'connect';
