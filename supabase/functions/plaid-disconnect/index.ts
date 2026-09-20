import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { requireUser } from '../_shared/auth.ts';
import { errorMessage, handlePreflight, json } from '../_shared/http.ts';
import { decryptAccessToken, encryptAccessToken, PlaidApiError, plaidPost } from '../_shared/plaid.ts';

type ItemRemoveResponse = { request_id: string };

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { admin, user } = await requireUser(request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const itemId = typeof body.itemId === 'string' ? body.itemId : null;
    if (!itemId) return json({ error: 'A connection is required.' }, 400);

    const { data: item, error } = await admin
      .from('plaid_items')
      .select('id, access_token_ciphertext, status')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!item) return json({ error: 'Connection not found.' }, 404);

    const now = new Date().toISOString();
    if (item.status !== 'disconnected') {
      await plaidPost<ItemRemoveResponse>('/item/remove', {
        access_token: await decryptAccessToken(item.access_token_ciphertext as string),
      });
      const { error: itemError } = await admin
        .from('plaid_items')
        .update({
          access_token_ciphertext: await encryptAccessToken(`revoked:${crypto.randomUUID()}`),
          status: 'disconnected',
          updated_at: now,
        })
        .eq('id', itemId)
        .eq('user_id', user.id);
      if (itemError) throw itemError;
    }

    const { data: disconnectedAccounts, error: accountError } = await admin
      .from('financial_accounts')
      .update({ disconnected_at: now, updated_at: now })
      .eq('plaid_item_id', itemId)
      .eq('user_id', user.id)
      .is('disconnected_at', null)
      .select('id');
    if (accountError) throw accountError;

    const { error: syncStateError } = await admin.from('plaid_sync_state').delete().eq('plaid_item_id', itemId);
    if (syncStateError) throw syncStateError;

    return json({ disconnected: true, disconnectedAccounts: disconnectedAccounts?.length ?? 0 });
  } catch (caught) {
    if (caught instanceof Response) {
      const payload = await caught.json().catch(() => ({ error: 'Authentication required' })) as Record<string, unknown>;
      return json(payload, caught.status);
    }
    if (caught instanceof PlaidApiError) return json({ error: caught.message, code: caught.code }, caught.code === 'PLAID_NOT_CONFIGURED' ? 503 : 502);
    return json({ error: errorMessage(caught) }, 500);
  }
});
