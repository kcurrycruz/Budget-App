import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createAdminClient } from '../_shared/auth.ts';
import { errorMessage, json } from '../_shared/http.ts';
import {
  processClaimedPlaidWebhookEvent,
  type ClaimedWebhookEvent,
} from '../_shared/plaidWebhookEvents.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const secret = request.headers.get('x-plaid-retry-secret') ?? '';
    const admin = createAdminClient();
    const { data: authorized, error: authorizationError } = await admin.rpc('authorize_plaid_webhook_retry', {
      p_secret: secret,
    });
    if (authorizationError) throw authorizationError;
    if (authorized !== true) return json({ error: 'Unauthorized' }, 401);

    const { data, error } = await admin.rpc('claim_plaid_webhook_events', { p_batch_size: 5 });
    if (error) throw error;
    const events = (data ?? []) as ClaimedWebhookEvent[];
    const results = await Promise.allSettled(events.map((event) => processClaimedPlaidWebhookEvent(admin, event)));
    const rejected = results.filter((result) => result.status === 'rejected');
    for (const result of rejected) console.error('Plaid webhook retry worker error', errorMessage(result.reason));

    return json({ claimed: events.length, completed: events.length - rejected.length });
  } catch (caught) {
    console.error('Plaid webhook retry worker failed', errorMessage(caught));
    return json({ error: 'Retry worker failed.' }, 500);
  }
});
