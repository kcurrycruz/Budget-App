import type { Category, ImportedTransactionDraft, Transaction } from '../types';

const columns = ['Date', 'Merchant', 'Amount', 'Type', 'Category', 'Subcategory', 'Note'] as const;
const maxImportRows = 500;

export type TransactionCsvPreview = {
  drafts: ImportedTransactionDraft[];
  duplicateCount: number;
  invalidCount: number;
  issues: string[];
  reviewCount: number;
  totalRows: number;
};

const normalize = (value: string) => value.trim().toLocaleLowerCase();

const escapeCell = (value: string | number) => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const transactionKey = (input: {
  amount: number;
  direction?: 'outflow' | 'inflow';
  merchant: string;
  transactionDate?: string;
}) => [
  input.transactionDate ?? '',
  normalize(input.merchant),
  Math.abs(input.amount).toFixed(2),
  input.direction ?? 'outflow',
].join('|');

export function createTransactionsCsv(transactions: Transaction[], categories: Category[]) {
  const rows = transactions.map((transaction) => {
    const category = categories.find((item) => item.id === transaction.categoryId);
    const subcategory = category?.subcategories.find((item) => item.id === transaction.subcategoryId);
    return [
      transaction.transactionDate ?? '',
      transaction.merchant,
      Math.abs(transaction.amount).toFixed(2),
      transaction.direction === 'inflow' ? 'Income' : 'Expense',
      transaction.direction === 'inflow' ? '' : category?.name ?? '',
      transaction.direction === 'inflow' ? '' : subcategory?.name ?? '',
      transaction.note ?? '',
    ];
  });

  return [columns, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

function parseCsvRows(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error('A quoted field is not closed.');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseAmount(value: string) {
  const trimmed = value.trim();
  const parsed = Number(trimmed.replace(/[,$()\s]/g, ''));
  return Math.abs(parsed);
}

function findColumn(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(normalize(header)));
}

export function parseTransactionsCsv(
  input: string,
  categories: Category[],
  existingTransactions: Transaction[],
): TransactionCsvPreview {
  const rows = parseCsvRows(input.replace(/^\uFEFF/, ''));
  const header = rows[0];
  if (!header) throw new Error('The CSV file is empty.');

  const dateIndex = findColumn(header, ['date', 'transaction date', 'transaction_date']);
  const merchantIndex = findColumn(header, ['merchant', 'description', 'name']);
  const amountIndex = findColumn(header, ['amount']);
  const typeIndex = findColumn(header, ['type', 'direction']);
  const categoryIndex = findColumn(header, ['category']);
  const subcategoryIndex = findColumn(header, ['subcategory', 'sub-category']);
  const noteIndex = findColumn(header, ['note', 'notes', 'memo']);

  if ([dateIndex, merchantIndex, amountIndex, typeIndex].some((index) => index < 0)) {
    throw new Error('Use the columns Date, Merchant, Amount, and Type. Export a Zenify CSV first if you need a template.');
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > maxImportRows) throw new Error(`Import up to ${maxImportRows} transactions at a time.`);

  const knownKeys = new Set(existingTransactions.map(transactionKey));
  const fileKeys = new Set<string>();
  const drafts: ImportedTransactionDraft[] = [];
  const issues: string[] = [];
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let duplicateCount = 0;
  let invalidCount = 0;
  let reviewCount = 0;

  dataRows.forEach((row, rowIndex) => {
    const displayRow = rowIndex + 2;
    const transactionDate = (row[dateIndex] ?? '').trim();
    const merchant = (row[merchantIndex] ?? '').trim();
    const amount = parseAmount(row[amountIndex] ?? '');
    const type = normalize(row[typeIndex] ?? '');

    if (!isValidDateOnly(transactionDate) || !merchant || !Number.isFinite(amount) || amount <= 0) {
      invalidCount += 1;
      if (issues.length < 4) issues.push(`Row ${displayRow}: check the date, merchant, and amount.`);
      return;
    }
    if (!transactionDate.startsWith(`${currentMonth}-`)) {
      invalidCount += 1;
      if (issues.length < 4) issues.push(`Row ${displayRow}: the date must be in ${currentMonth}.`);
      return;
    }

    let direction: 'outflow' | 'inflow';
    if (['expense', 'outflow', 'debit', 'spending'].includes(type)) direction = 'outflow';
    else if (['income', 'inflow', 'credit', 'deposit'].includes(type)) direction = 'inflow';
    else {
      invalidCount += 1;
      if (issues.length < 4) issues.push(`Row ${displayRow}: Type must be Expense or Income.`);
      return;
    }

    const categoryName = (row[categoryIndex] ?? '').trim();
    const category = direction === 'outflow'
      ? categories.find((item) => normalize(item.name) === normalize(categoryName))
      : undefined;
    const subcategoryName = (row[subcategoryIndex] ?? '').trim();
    const subcategory = category?.subcategories.find((item) => normalize(item.name) === normalize(subcategoryName));
    const needsReview = direction === 'outflow' && (!category || Boolean(subcategoryName && !subcategory));
    const draft: ImportedTransactionDraft = {
      amount,
      categoryId: category?.id ?? '',
      direction,
      merchant,
      needsReview,
      note: (row[noteIndex] ?? '').trim(),
      subcategoryId: subcategory?.id,
      transactionDate,
    };
    const key = transactionKey(draft);
    if (knownKeys.has(key) || fileKeys.has(key)) {
      duplicateCount += 1;
      return;
    }

    fileKeys.add(key);
    drafts.push(draft);
    if (needsReview) reviewCount += 1;
  });

  return { drafts, duplicateCount, invalidCount, issues, reviewCount, totalRows: dataRows.length };
}
