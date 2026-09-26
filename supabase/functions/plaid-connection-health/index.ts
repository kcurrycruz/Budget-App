import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { requireUser } from '../_shared/auth.ts';
import { handlePreflight, json } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { admin, user } = await requireUser(request);
    const { data: items, error: itemsError } = await admin
      .from('plaid_items')
      .select('id, status')
      .eq('user_id', user.id)
      .neq('status', 'disconnected');
    if (itemsError) throw itemsError;
    if (!items?.length) return json({ connections: [] });

    const { data: states, error: statesError } = await admin
      .from('plaid_sync_state')
      .select('plaid_item_id, last_error')
      .in('plaid_item_id', items.map((item) => item.id));
    if (statesError) throw statesError;
    const syncErrors = new Set((states ?? [])
      .filter((state) => Boolean(state.last_error))
      .map((state) => state.plaid_item_id as string));

    return json({
      connections: items.map((item) => ({
        itemId: item.id,
        issue: item.status === 'login_required' ? 'repair' : syncErrors.has(item.id) ? 'retry' : null,
      })),
    });
  } catch (caught) {
    if (caught instanceof Response) {
      const payload = await caught.json().catch(() => ({ error: 'Authentication required' })) as Record<string, unknown>;
      return json(payload, caught.status);
    }
    console.error('Could not load Plaid connection health', caught);
    return json({ error: 'Could not load connection health.' }, 500);
  }
});
