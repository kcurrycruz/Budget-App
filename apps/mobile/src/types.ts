export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  spent: number;
  budget: number;
};

export type Transaction = {
  id: string;
  merchant: string;
  categoryId: string;
  amount: number;
  date: string;
  account: string;
  direction?: 'outflow' | 'inflow';
  needsReview?: boolean;
  pending?: boolean;
};

export type Account = {
  id: string;
  name: string;
  institution: string;
  mask: string;
  balance: number;
  type: 'checking' | 'credit' | 'savings' | 'loan' | 'investment' | 'other';
  syncedAt: string;
};

export type AppTab = 'home' | 'transactions' | 'plan' | 'connect';
