export const toDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatActivityDate = (dateOnly: string) => {
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

export const currentMonthStart = () => {
  const now = new Date();
  return toDateOnly(new Date(now.getFullYear(), now.getMonth(), 1));
};

export const parseDateOnly = (dateOnly: string) => {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
};

export const shiftMonth = (monthStart: string, amount: number) => {
  const date = parseDateOnly(monthStart);
  return toDateOnly(new Date(date.getFullYear(), date.getMonth() + amount, 1));
};

export const formatMonth = (monthStart: string, includeYear = true) => (
  parseDateOnly(monthStart).toLocaleDateString('en-US', {
    month: 'long',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  })
);

export const recurringBillDueDate = (dueDay: number, monthStart = currentMonthStart()) => {
  const month = parseDateOnly(monthStart);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return new Date(month.getFullYear(), month.getMonth(), Math.min(dueDay, lastDay));
};

export const formatRecurringDueDate = (dueDay: number, monthStart = currentMonthStart()) => (
  recurringBillDueDate(dueDay, monthStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
);

export const formatTargetMonth = (targetMonth: string, long = false) => {
  const [year, month] = targetMonth.split('-').map(Number);
  if (!year || !month) return targetMonth;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: long ? 'long' : 'short',
    year: 'numeric',
  });
};

export const plannedExpenseMonthlyAmount = (amount: number, targetMonth: string, referenceMonth = currentMonthStart()) => {
  const now = parseDateOnly(referenceMonth);
  const [year, month] = targetMonth.split('-').map(Number);
  if (!year || !month) return amount;
  const monthsRemaining = Math.max(1, ((year - now.getFullYear()) * 12) + month - now.getMonth());
  return amount / monthsRemaining;
};

export const savingsGoalMonthlyAmount = (targetAmount: number, currentAmount: number, targetMonth: string, referenceMonth = currentMonthStart()) => (
  plannedExpenseMonthlyAmount(Math.max(targetAmount - currentAmount, 0), targetMonth, referenceMonth)
);
