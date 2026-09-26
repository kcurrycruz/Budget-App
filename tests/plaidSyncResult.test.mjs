import assert from 'node:assert/strict';

import { recoverFailedPlaidSync } from '../apps/mobile/src/utils/plaidSyncResult.ts';

assert.deepEqual(recoverFailedPlaidSync({
  error: 'All connections failed.',
  results: [{ itemId: 'bank-1', error: 'Bank sign-in expired.' }],
}), {
  syncedItems: 0,
  results: [{ itemId: 'bank-1', error: 'Bank sign-in expired.' }],
});
assert.equal(recoverFailedPlaidSync({ error: 'No accounts connected.' }), null);
assert.equal(recoverFailedPlaidSync({ results: [] }), null);
assert.equal(recoverFailedPlaidSync({ results: [{ itemId: 'bank-1', added: 1 }] }), null);

console.log('Plaid sync result tests passed.');
