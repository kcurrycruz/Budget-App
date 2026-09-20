import type { Account, Category, Transaction } from '../types';

export const monthlyIncome = 7000;
export const monthlyBills = 2780;

export const initialCategories: Category[] = [
  { id: 'home', name: 'Home', color: '#5C7CFA', icon: 'home-variant-outline', spent: 1820, budget: 2100 },
  { id: 'food', name: 'Food', color: '#E98A4C', icon: 'silverware-fork-knife', spent: 486, budget: 650 },
  { id: 'transport', name: 'Transport', color: '#A16AE8', icon: 'car-outline', spent: 218, budget: 350 },
  { id: 'fun', name: 'Fun', color: '#D65D7A', icon: 'ticket-outline', spent: 164, budget: 300 },
  { id: 'other', name: 'Other', color: '#5A9E91', icon: 'dots-horizontal-circle-outline', spent: 92, budget: 250 },
];

export const initialTransactions: Transaction[] = [
  { id: 't1', merchant: 'Trader Joe’s', categoryId: 'food', amount: 74.28, date: 'Today', account: 'Everyday checking', source: 'plaid', transactionDate: '2026-09-20' },
  { id: 't2', merchant: 'City Electric', categoryId: 'home', amount: 118.44, date: 'Yesterday', account: 'Everyday checking', source: 'plaid', transactionDate: '2026-09-19' },
  { id: 't3', merchant: 'Metro Card', categoryId: 'transport', amount: 32, date: 'Sep 17', account: 'Everyday checking', source: 'plaid', transactionDate: '2026-09-17' },
  { id: 't4', merchant: 'Corner Coffee', categoryId: 'food', amount: 6.85, date: 'Sep 17', account: 'Rewards card', pending: true, source: 'plaid', transactionDate: '2026-09-17' },
  { id: 't5', merchant: 'Movie Night', categoryId: 'fun', amount: 28, date: 'Sep 15', account: 'Manual entry', note: 'Tickets and snacks', source: 'manual', transactionDate: '2026-09-15' },
];

export const accounts: Account[] = [
  { id: 'a1', name: 'Everyday checking', institution: 'Demo Bank', mask: '2048', balance: 4280.12, type: 'checking', syncedAt: '2 min ago' },
  { id: 'a2', name: 'Rewards card', institution: 'Demo Credit', mask: '1082', balance: -842.56, type: 'credit', syncedAt: '2 min ago' },
];
