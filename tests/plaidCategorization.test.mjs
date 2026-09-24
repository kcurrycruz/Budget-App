import assert from 'node:assert/strict';

import { resolvePlaidCategory } from '../supabase/functions/_shared/plaidCategorization.ts';

const categories = [
  { id: 'home', name: 'Home' },
  { id: 'food', name: 'Food' },
  { id: 'transport', name: 'Transport' },
  { id: 'fun', name: 'Fun' },
  { id: 'other', name: 'Other' },
];

const subcategories = [
  { id: 'groceries', category_id: 'food', name: 'Groceries' },
  { id: 'dining', category_id: 'food', name: 'Dining out' },
  { id: 'utilities', category_id: 'home', name: 'Utilities' },
  { id: 'transit', category_id: 'transport', name: 'Public transit' },
];

assert.deepEqual(resolvePlaidCategory({
  confidence_level: 'VERY_HIGH',
  detailed: 'FOOD_AND_DRINK_GROCERIES',
  primary: 'FOOD_AND_DRINK',
}, categories, subcategories), {
  categoryId: 'food',
  confident: true,
  subcategoryId: 'groceries',
});

assert.deepEqual(resolvePlaidCategory({
  confidence_level: 'MEDIUM',
  detailed: 'FOOD_AND_DRINK_RESTAURANT',
  primary: 'FOOD_AND_DRINK',
}, categories, subcategories), {
  categoryId: 'food',
  confident: false,
  subcategoryId: 'dining',
});

assert.deepEqual(resolvePlaidCategory({
  confidence_level: 'HIGH',
  detailed: 'MEDICAL_PRIMARY_CARE',
  primary: 'MEDICAL',
}, [{ id: 'health', name: 'Health' }], []), {
  categoryId: 'health',
  confident: true,
  subcategoryId: null,
});

assert.deepEqual(resolvePlaidCategory({
  confidence_level: 'VERY_HIGH',
  detailed: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES',
  primary: 'GENERAL_SERVICES',
}, categories, subcategories), {
  categoryId: null,
  confident: false,
  subcategoryId: null,
});

console.log('Plaid categorization tests passed.');
