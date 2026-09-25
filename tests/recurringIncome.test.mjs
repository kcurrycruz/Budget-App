import assert from 'node:assert/strict';

import { detectRecurringIncome } from '../apps/mobile/src/utils/recurringIncome.ts';

const paycheck = (transaction_date, amount = 1200, merchant_name = 'Acme Payroll') => ({
  amount,
  merchant_name,
  plaid_category_detailed: 'INCOME_WAGES',
  transaction_date,
});

const biweekly = detectRecurringIncome([
  paycheck('2026-08-14', 1180),
  paycheck('2026-08-28', 1210),
  paycheck('2026-09-11', 1200),
], new Set(), '2026-09-24');
assert.deepEqual(biweekly, {
  cadence: 'biweekly',
  monthlyAmount: 2601.63,
  occurrenceCount: 3,
  payerName: 'Acme Payroll',
  sourceCount: 1,
  sourceKeys: ['acme payroll:biweekly'],
});

assert.equal(detectRecurringIncome([
  paycheck('2026-07-01'),
  paycheck('2026-08-01'),
  paycheck('2026-09-01'),
], new Set(['acme payroll:monthly']), '2026-09-24'), undefined);

assert.equal(detectRecurringIncome([
  paycheck('2026-09-01'),
  paycheck('2026-09-05'),
  paycheck('2026-09-20'),
], new Set(), '2026-09-24'), undefined);

const multiple = detectRecurringIncome([
  paycheck('2026-08-14'),
  paycheck('2026-08-28'),
  paycheck('2026-09-11'),
  paycheck('2026-07-05', 500, 'Side Gig LLC'),
  paycheck('2026-08-05', 500, 'Side Gig LLC'),
  paycheck('2026-09-05', 500, 'Side Gig LLC'),
], new Set(), '2026-09-24');
assert.equal(multiple?.cadence, 'multiple');
assert.equal(multiple?.monthlyAmount, 3099.8);
assert.equal(multiple?.sourceCount, 2);

console.log('Recurring income tests passed.');
