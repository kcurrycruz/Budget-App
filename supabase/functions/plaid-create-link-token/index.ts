import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { requireUser } from '../_shared/auth.ts';
import { errorMessage, handlePreflight, json } from '../_shared/http.ts';
import { PlaidApiError, plaidPost } from '../_shared/plaid.ts';

type LinkTokenResponse = { expiration: string; link_token: string };

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { user } = await requireUser(request);
    const response = await plaidPost<LinkTokenResponse>('/link/token/create', {
      client_name: 'KC Budget',
      user: { client_user_id: user.id },
      products: ['transactions'],
      transactions: { days_requested: 180 },
      country_codes: ['US'],
      language: 'en',
    });
    return json({ linkToken: response.link_token, expiration: response.expiration });
  } catch (caught) {
    if (caught instanceof Response) {
      const payload = await caught.json().catch(() => ({ error: 'Authentication required' })) as Record<string, unknown>;
      return json(payload, caught.status);
    }
    if (caught instanceof PlaidApiError) return json({ error: caught.message, code: caught.code }, caught.code === 'PLAID_NOT_CONFIGURED' ? 503 : 502);
    return json({ error: errorMessage(caught) }, 500);
  }
});
