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
    const { data: items, error } = await admin
      .from('plaid_items')
      .select('id, user_id, institution_name, access_token_ciphertext')
      .eq('user_id', user.id)
      .eq('status', 'active');
    if (error) throw error;
    if (!items?.length) return json({ error: 'Connect an account before syncing.' }, 400);

    const results = [];
    for (const item of items as PlaidItemRow[]) {
      try {
        results.push({ itemId: item.id, ...(await syncPlaidItem(admin, item, await decryptAccessToken(item.access_token_ciphertext))) });
      } catch (caught) {
        const message = errorMessage(caught);
        await admin.from('plaid_sync_state').update({
          last_error: message.slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq('plaid_item_id', item.id);
        if (caught instanceof PlaidApiError && caught.code === 'ITEM_LOGIN_REQUIRED') {
          await admin.from('plaid_items').update({ status: 'login_required', updated_at: new Date().toISOString() }).eq('id', item.id);
        }
        results.push({ itemId: item.id, error: message });
      }
    }

    const succeeded = results.filter((result) => !('error' in result)).length;
    if (succeeded === 0) return json({ error: results[0]?.error ?? 'No accounts could be synced.', results }, 502);
    return json({ syncedItems: succeeded, results });
  } catch (caught) {
    if (caught instanceof Response) {
      const payload = await caught.json().catch(() => ({ error: 'Authentication required' })) as Record<string, unknown>;
      return json(payload, caught.status);
    }
    if (caught instanceof PlaidApiError) return json({ error: caught.message, code: caught.code }, caught.code === 'PLAID_NOT_CONFIGURED' ? 503 : 502);
    return json({ error: errorMessage(caught) }, 500);
  }
});
