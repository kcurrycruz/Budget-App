import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { requireUser } from '../_shared/auth.ts';
import { errorMessage, handlePreflight, json } from '../_shared/http.ts';
import { encryptAccessToken, PlaidApiError, plaidPost } from '../_shared/plaid.ts';
import { syncPlaidItem, upsertAccounts, type PlaidItemRow } from '../_shared/sync.ts';

type ExchangeResponse = { access_token: string; item_id: string };
type ItemResponse = { item: { institution_id: string | null; institution_name?: string | null } };
type AccountsResponse = { accounts: Parameters<typeof upsertAccounts>[2] };

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { admin, user } = await requireUser(request);
    const body = await request.json().catch(() => ({})) as { institutionName?: unknown; publicToken?: unknown };
    if (typeof body.publicToken !== 'string' || body.publicToken.length < 10 || body.publicToken.length > 600) {
      return json({ error: 'A valid Plaid public token is required.' }, 400);
    }

    const exchanged = await plaidPost<ExchangeResponse>('/item/public_token/exchange', { public_token: body.publicToken });
    const [itemResponse, accountResponse] = await Promise.all([
      plaidPost<ItemResponse>('/item/get', { access_token: exchanged.access_token }),
      plaidPost<AccountsResponse>('/accounts/get', { access_token: exchanged.access_token }),
    ]);
    const institutionName = itemResponse.item.institution_name
      ?? (typeof body.institutionName === 'string' ? body.institutionName.slice(0, 120) : null);
    const now = new Date().toISOString();
    const { data: existingItem, error: existingError } = await admin
      .from('plaid_items')
      .select('id, user_id')
      .eq('plaid_item_id', exchanged.item_id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingItem && existingItem.user_id !== user.id) {
      return json({ error: 'This bank connection belongs to another account.' }, 409);
    }

    const encryptedToken = await encryptAccessToken(exchanged.access_token);
    const itemMutation = existingItem
      ? admin.from('plaid_items').update({
          access_token_ciphertext: encryptedToken,
          institution_id: itemResponse.item.institution_id,
          institution_name: institutionName,
          status: 'active',
          updated_at: now,
        }).eq('id', existingItem.id)
      : admin.from('plaid_items').insert({
          user_id: user.id,
          plaid_item_id: exchanged.item_id,
          access_token_ciphertext: encryptedToken,
          institution_id: itemResponse.item.institution_id,
          institution_name: institutionName,
          status: 'active',
          updated_at: now,
        });
    const { data: item, error: itemError } = await itemMutation
      .select('id, user_id, institution_name, access_token_ciphertext')
      .single();
    if (itemError) throw itemError;

    const itemRow = item as PlaidItemRow;
    const { error: stateError } = await admin.from('plaid_sync_state').upsert({
      plaid_item_id: itemRow.id,
      updated_at: now,
    }, { onConflict: 'plaid_item_id' });
    if (stateError) throw stateError;
    await upsertAccounts(admin, itemRow, accountResponse.accounts);

    try {
      const synced = await syncPlaidItem(admin, itemRow, exchanged.access_token);
      return json({ connected: true, accounts: accountResponse.accounts.length, synced });
    } catch (syncError) {
      await admin.from('plaid_sync_state').update({
        last_error: errorMessage(syncError).slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq('plaid_item_id', itemRow.id);
      return json({ connected: true, accounts: accountResponse.accounts.length, syncPending: true });
    }
  } catch (caught) {
    if (caught instanceof Response) {
      const payload = await caught.json().catch(() => ({ error: 'Authentication required' })) as Record<string, unknown>;
      return json(payload, caught.status);
    }
    if (caught instanceof PlaidApiError) return json({ error: caught.message, code: caught.code, ...(caught.requestId ? { requestId: caught.requestId } : {}) }, caught.code === 'PLAID_NOT_CONFIGURED' ? 503 : 502);
    return json({ error: errorMessage(caught) }, 500);
  }
});
