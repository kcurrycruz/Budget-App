import type { Account } from '../types';

export function summarizeNetWorth(accounts: Account[]) {
  return accounts.reduce((summary, account) => {
    if (account.type === 'credit' || account.type === 'loan') {
      summary.debts += Math.abs(account.balance);
    } else if (account.balance >= 0) {
      summary.assets += account.balance;
    } else {
      summary.debts += Math.abs(account.balance);
    }
    return summary;
  }, { assets: 0, debts: 0 });
}
