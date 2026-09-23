import type { Account, Category, PlannedExpense, RecurringBill, Transaction } from '../types';

export const monthlyIncome = 7000;
export const monthlyBills = 2780;
export const previousMonthToDateSpent = 3140;

export const initialRecurringBills: RecurringBill[] = [
  { id: 'b1', name: 'Rent', amount: 1850, dueDay: 1, categoryId: 'home', paid: true, paidAt: '2026-09-01T12:00:00Z' },
  { id: 'b2', name: 'City Electric', amount: 118.44, dueDay: 24, categoryId: 'home', paid: false },
  { id: 'b3', name: 'Internet', amount: 79.99, dueDay: 27, categoryId: 'home', paid: false },
  { id: 'b4', name: 'Streaming bundle', amount: 24.99, dueDay: 29, categoryId: 'fun', paid: false },
];

export const initialPlannedExpenses: PlannedExpense[] = [
  { id: 'p1', name: 'Holiday travel', amount: 900, targetMonth: '2026-12-01', categoryId: 'fun', covered: false },
];

export const initialCategories: Category[] = [
  { id: 'home', name: 'Home', color: '#5C7CFA', icon: 'home-variant-outline', spendingGroup: 'needs', spent: 1820, budget: 2100, subcategories: [{ id: 'home-utilities', categoryId: 'home', name: 'Utilities' }] },
  { id: 'food', name: 'Food', color: '#E98A4C', icon: 'silverware-fork-knife', spendingGroup: 'needs', spent: 486, budget: 650, subcategories: [{ id: 'food-groceries', categoryId: 'food', name: 'Groceries' }, { id: 'food-dining', categoryId: 'food', name: 'Dining out' }] },
  { id: 'transport', name: 'Transport', color: '#A16AE8', icon: 'car-outline', spendingGroup: 'needs', spent: 218, budget: 350, subcategories: [{ id: 'transport-transit', categoryId: 'transport', name: 'Public transit' }] },
  { id: 'fun', name: 'Fun', color: '#D65D7A', icon: 'ticket-outline', spendingGroup: 'wants', spent: 164, budget: 300, subcategories: [] },
  { id: 'other', name: 'Other', color: '#5A9E91', icon: 'dots-horizontal-circle-outline', spendingGroup: 'wants', spent: 92, budget: 250, subcategories: [] },
];

export const initialTransactions: Transaction[] = [
  { id: 't1', merchant: 'Trader Joe’s', categoryId: 'food', subcategoryId: 'food-groceries', amount: 74.28, date: 'Today', account: 'Everyday checking', source: 'plaid', transactionDate: '2026-09-20' },
  { id: 't2', merchant: 'City Electric', categoryId: 'home', subcategoryId: 'home-utilities', amount: 118.44, date: 'Yesterday', account: 'Everyday checking', source: 'plaid', transactionDate: '2026-09-19' },
  { id: 't3', merchant: 'Metro Card', categoryId: 'transport', subcategoryId: 'transport-transit', amount: 32, date: 'Sep 17', account: 'Everyday checking', source: 'plaid', transactionDate: '2026-09-17' },
  { id: 't4', merchant: 'Corner Coffee', categoryId: 'food', subcategoryId: 'food-dining', amount: 6.85, date: 'Sep 17', account: 'Rewards card', pending: true, source: 'plaid', transactionDate: '2026-09-17' },
  { id: 't5', merchant: 'Movie Night', categoryId: 'fun', amount: 28, date: 'Sep 15', account: 'Manual entry', note: 'Tickets and snacks', source: 'manual', transactionDate: '2026-09-15' },
];

export const accounts: Account[] = [
  { id: 'a1', name: 'Everyday checking', institution: 'Demo Bank', mask: '2048', balance: 4280.12, type: 'checking', syncedAt: '2 min ago' },
  { id: 'a2', name: 'Rewards card', institution: 'Demo Credit', mask: '1082', balance: -842.56, type: 'credit', syncedAt: '2 min ago' },
];
