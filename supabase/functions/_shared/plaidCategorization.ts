export type PlaidCategoryConfidence = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type PlaidPersonalFinanceCategory = {
  confidence_level?: PlaidCategoryConfidence | null;
  detailed?: string;
  primary?: string;
};

export type BudgetCategory = {
  id: string;
  name: string;
};

export type BudgetSubcategory = BudgetCategory & {
  category_id: string;
};

type CategoryMatch = {
  categoryId: string | null;
  confident: boolean;
  subcategoryId: string | null;
};

const normalize = (value: string) => value
  .trim()
  .toLocaleLowerCase('en-US')
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const PRIMARY_ALIASES: Record<string, string[]> = {
  BANK_FEES: ['bank fees', 'fees'],
  ENTERTAINMENT: ['fun', 'entertainment'],
  FOOD_AND_DRINK: ['food', 'food and drink', 'dining'],
  GENERAL_MERCHANDISE: ['shopping', 'general merchandise'],
  GOVERNMENT_AND_NON_PROFIT: ['giving', 'charity', 'government and nonprofit'],
  HOME_IMPROVEMENT: ['home', 'housing', 'home improvement'],
  LOAN_PAYMENTS: ['debt', 'loan payments', 'loans'],
  MEDICAL: ['health', 'medical', 'healthcare'],
  PERSONAL_CARE: ['personal', 'personal care', 'self care'],
  RENT_AND_UTILITIES: ['home', 'housing', 'rent and utilities'],
  TRANSFER_OUT: ['transfers', 'transfer'],
  TRANSPORTATION: ['transport', 'transportation'],
  TRAVEL: ['travel'],
};

const DETAILED_SUBCATEGORY_ALIASES: Array<{ prefixes: string[]; aliases: string[] }> = [
  {
    prefixes: ['FOOD_AND_DRINK_COFFEE', 'FOOD_AND_DRINK_FAST_FOOD', 'FOOD_AND_DRINK_RESTAURANT'],
    aliases: ['dining out', 'restaurants', 'restaurant', 'dining'],
  },
  {
    prefixes: ['FOOD_AND_DRINK_GROCERIES'],
    aliases: ['groceries', 'grocery'],
  },
  {
    prefixes: [
      'RENT_AND_UTILITIES_GAS_AND_ELECTRICITY',
      'RENT_AND_UTILITIES_INTERNET_AND_CABLE',
      'RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT',
      'RENT_AND_UTILITIES_TELEPHONE',
      'RENT_AND_UTILITIES_WATER',
    ],
    aliases: ['utilities', 'utility'],
  },
  {
    prefixes: ['TRANSPORTATION_PUBLIC_TRANSIT'],
    aliases: ['public transit', 'transit'],
  },
];

const findByAliases = <T extends BudgetCategory>(rows: T[], aliases: string[]) => {
  const aliasSet = new Set(aliases.map(normalize));
  return rows.find((row) => aliasSet.has(normalize(row.name)));
};

const hasStrongConfidence = (confidence?: PlaidCategoryConfidence | null) => (
  confidence === 'VERY_HIGH' || confidence === 'HIGH'
);

export function resolvePlaidCategory(
  plaidCategory: PlaidPersonalFinanceCategory | null,
  categories: BudgetCategory[],
  subcategories: BudgetSubcategory[],
): CategoryMatch {
  const primary = plaidCategory?.primary;
  const aliases = primary ? PRIMARY_ALIASES[primary] : undefined;
  const category = aliases ? findByAliases(categories, aliases) : undefined;
  if (!category) return { categoryId: null, confident: false, subcategoryId: null };

  const detail = plaidCategory?.detailed ?? '';
  const subcategoryAliases = DETAILED_SUBCATEGORY_ALIASES
    .find((candidate) => candidate.prefixes.some((prefix) => detail.startsWith(prefix)))
    ?.aliases;
  const subcategory = subcategoryAliases
    ? findByAliases(subcategories.filter((row) => row.category_id === category.id), subcategoryAliases)
    : undefined;

  return {
    categoryId: category.id,
    confident: hasStrongConfidence(plaidCategory?.confidence_level),
    subcategoryId: subcategory?.id ?? null,
  };
}
