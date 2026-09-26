import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { requireUser } from '../_shared/auth.ts';
import { errorMessage, handlePreflight, json } from '../_shared/http.ts';
import { decryptAccessToken, PlaidApiError, plaidEnvironment, plaidPost, plaidRedirectUri, plaidWebhookUrl } from '../_shared/plaid.ts';

type LinkTokenResponse = { expiration: string; link_token: string };

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { admin, user } = await requireUser(request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const itemId = typeof body.itemId === 'string' ? body.itemId : null;
    const environment = plaidEnvironment();
    const redirectUri = plaidRedirectUri();
    const baseRequest = {
      client_name: 'Zenify',
      user: { client_user_id: user.id },
      country_codes: ['US'],
      language: 'en',
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
    };

    if (itemId) {
      const { data: item, error } = await admin
        .from('plaid_items')
        .select('id, access_token_ciphertext, status')
        .eq('id', itemId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!item) return json({ error: 'Connection not found.' }, 404);
      if (item.status === 'disconnected') return json({ error: 'This connection has already been disconnected.' }, 409);

      const response = await plaidPost<LinkTokenResponse>('/link/token/create', {
        ...baseRequest,
        access_token: await decryptAccessToken(item.access_token_ciphertext as string),
      });
      return json({ environment, linkToken: response.link_token, expiration: response.expiration, updateMode: true });
    }

    const response = await plaidPost<LinkTokenResponse>('/link/token/create', {
      ...baseRequest,
      products: ['transactions'],
      transactions: { days_requested: 180 },
      webhook: plaidWebhookUrl(),
    });
    return json({ environment, linkToken: response.link_token, expiration: response.expiration, updateMode: false });
  } catch (caught) {
    if (caught instanceof Response) {
      const payload = await caught.json().catch(() => ({ error: 'Authentication required' })) as Record<string, unknown>;
      return json(payload, caught.status);
    }
    if (caught instanceof PlaidApiError) return json({ error: caught.message, code: caught.code, ...(caught.requestId ? { requestId: caught.requestId } : {}) }, caught.code === 'PLAID_NOT_CONFIGURED' ? 503 : 502);
    return json({ error: errorMessage(caught) }, 500);
  }
});
