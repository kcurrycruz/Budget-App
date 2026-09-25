import type { IncomeSuggestion } from '../types';

export type IncomeHistoryRow = {
  amount: number | string;
  merchant_name: string;
  plaid_category_detailed: string | null;
  transaction_date: string;
};

type IncomeCadence = Exclude<IncomeSuggestion['cadence'], 'multiple'>;

type IncomePattern = {
  cadence: IncomeCadence;
  monthlyAmount: number;
  occurrenceCount: number;
  payerName: string;
  sourceKey: string;
};

const cadenceDefinitions: Array<{
  cadence: IncomeCadence;
  maxGap: number;
  maxStaleDays: number;
  minGap: number;
}> = [
  { cadence: 'weekly', minGap: 5, maxGap: 9, maxStaleDays: 15 },
  { cadence: 'biweekly', minGap: 12, maxGap: 18, maxStaleDays: 26 },
  { cadence: 'monthly', minGap: 25, maxGap: 35, maxStaleDays: 46 },
];

const normalizePayer = (value: string) => value
  .trim()
  .toLocaleLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .slice(0, 140);

const dateValue = (value: string) => Date.parse(`${value}T00:00:00Z`);
const daysBetween = (left: string, right: string) => Math.round((dateValue(right) - dateValue(left)) / 86_400_000);

const findCadenceChain = (
  rows: IncomeHistoryRow[],
  definition: (typeof cadenceDefinitions)[number],
) => {
  const sorted = [...rows].sort((left, right) => left.transaction_date.localeCompare(right.transaction_date));
  const newest = sorted.at(-1);
  if (!newest) return [];
  const chain = [newest];

  for (let index = sorted.length - 2; index >= 0 && chain.length < 6; index -= 1) {
    const candidate = sorted[index];
    const next = chain[0];
    if (!candidate || !next) continue;
    const gap = daysBetween(candidate.transaction_date, next.transaction_date);
    if (gap >= definition.minGap && gap <= definition.maxGap) chain.unshift(candidate);
    else if (gap > definition.maxGap) break;
  }

  return chain;
};

const findPattern = (payerName: string, rows: IncomeHistoryRow[], today: string): IncomePattern | null => {
  const candidates = cadenceDefinitions
    .map((definition) => ({ definition, rows: findCadenceChain(rows, definition) }))
    .filter((candidate) => candidate.rows.length >= 3)
    .sort((left, right) => right.rows.length - left.rows.length || left.definition.maxGap - right.definition.maxGap);
  const match = candidates[0];
  if (!match) return null;

  const latest = match.rows.at(-1);
  if (!latest || daysBetween(latest.transaction_date, today) > match.definition.maxStaleDays) return null;

  const amounts = match.rows.map((row) => Number(row.amount)).filter((amount) => Number.isFinite(amount) && amount > 0);
  if (amounts.length !== match.rows.length) return null;
  const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  const tolerance = Math.max(100, average * 0.35);
  if (amounts.some((amount) => Math.abs(amount - average) > tolerance)) return null;
  const gaps = match.rows.slice(1).map((row, index) => daysBetween(match.rows[index]!.transaction_date, row.transaction_date));
  const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  if (!Number.isFinite(averageGap) || averageGap <= 0) return null;

  const payerKey = normalizePayer(payerName);
  if (!payerKey) return null;
  return {
    cadence: match.definition.cadence,
    monthlyAmount: Math.round(average * (365.2425 / 12 / averageGap) * 100) / 100,
    occurrenceCount: match.rows.length,
    payerName: payerName.trim(),
    sourceKey: `${payerKey}:${match.definition.cadence}`,
  };
};

export function detectRecurringIncome(
  rows: IncomeHistoryRow[],
  resolvedKeys: Set<string>,
  today = new Date().toISOString().slice(0, 10),
): IncomeSuggestion | undefined {
  const grouped = new Map<string, IncomeHistoryRow[]>();
  for (const row of rows) {
    const payerKey = normalizePayer(row.merchant_name);
    if (!payerKey) continue;
    grouped.set(payerKey, [...(grouped.get(payerKey) ?? []), row]);
  }

  const patterns = [...grouped.values()]
    .map((payerRows) => findPattern(payerRows.at(-1)?.merchant_name ?? '', payerRows, today))
    .filter((pattern): pattern is IncomePattern => Boolean(pattern))
    .filter((pattern) => !resolvedKeys.has(pattern.sourceKey))
    .sort((left, right) => right.monthlyAmount - left.monthlyAmount)
    .slice(0, 5);
  if (patterns.length === 0) return undefined;
  const firstPattern = patterns[0];
  if (!firstPattern) return undefined;

  return {
    cadence: patterns.length === 1 ? firstPattern.cadence : 'multiple',
    monthlyAmount: Math.round(patterns.reduce((sum, pattern) => sum + pattern.monthlyAmount, 0) * 100) / 100,
    occurrenceCount: patterns.reduce((sum, pattern) => sum + pattern.occurrenceCount, 0),
    payerName: patterns.length === 1 ? firstPattern.payerName : `${firstPattern.payerName} + ${patterns.length - 1} more`,
    sourceCount: patterns.length,
    sourceKeys: patterns.map((pattern) => pattern.sourceKey),
  };
}
