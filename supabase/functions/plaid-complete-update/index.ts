import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { requireUser } from '../_shared/auth.ts';
import { errorMessage, handlePreflight, json } from '../_shared/http.ts';
import { decryptAccessToken, PlaidApiError } from '../_shared/plaid.ts';
import { syncPlaidItem, type PlaidItemRow } from '../_shared/sync.ts';

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
      .select('id, user_id, institution_name, access_token_ciphertext, status')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!item) return json({ error: 'Connection not found.' }, 404);
    if (item.status === 'disconnected') return json({ error: 'This connection has been disconnected.' }, 409);

    const result = await syncPlaidItem(
      admin,
      item as PlaidItemRow,
      await decryptAccessToken(item.access_token_ciphertext as string),
    );
    const { error: updateError } = await admin
      .from('plaid_items')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('user_id', user.id);
    if (updateError) throw updateError;

    return json({ repaired: true, result });
  } catch (caught) {
    if (caught instanceof Response) {
      const payload = await caught.json().catch(() => ({ error: 'Authentication required' })) as Record<string, unknown>;
      return json(payload, caught.status);
    }
    if (caught instanceof PlaidApiError) return json({ error: caught.message, code: caught.code }, caught.code === 'PLAID_NOT_CONFIGURED' ? 503 : 502);
    return json({ error: errorMessage(caught) }, 500);
  }
});
