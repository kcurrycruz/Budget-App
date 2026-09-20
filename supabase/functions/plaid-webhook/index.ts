import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from 'jose';

import { createAdminClient } from '../_shared/auth.ts';
import { errorMessage, json } from '../_shared/http.ts';
import { PlaidApiError, plaidPost } from '../_shared/plaid.ts';
import {
  processClaimedPlaidWebhookEvent,
  type PlaidWebhook,
} from '../_shared/plaidWebhookEvents.ts';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

type VerificationKeyResponse = {
  key: JWK & { created_at?: number; expired_at?: number | null };
};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const constantTimeEqual = (left: string, right: string) => {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
};

const verifyWebhook = async (request: Request, rawBody: string) => {
  const signedJwt = request.headers.get('Plaid-Verification');
  if (!signedJwt) throw new Response(JSON.stringify({ error: 'Missing Plaid verification signature.' }), { status: 401 });

  let header: ReturnType<typeof decodeProtectedHeader>;
  try {
    header = decodeProtectedHeader(signedJwt);
  } catch {
    throw new Response(JSON.stringify({ error: 'Invalid Plaid verification signature.' }), { status: 401 });
  }
  if (header.alg !== 'ES256' || typeof header.kid !== 'string' || header.kid.length > 200) {
    throw new Response(JSON.stringify({ error: 'Unsupported Plaid verification signature.' }), { status: 401 });
  }

  const { key } = await plaidPost<VerificationKeyResponse>('/webhook_verification_key/get', { key_id: header.kid });
  const now = Math.floor(Date.now() / 1000);
  if (key.alg !== 'ES256' || key.kid !== header.kid || key.kty !== 'EC' || key.crv !== 'P-256' || key.use !== 'sig') {
    throw new Response(JSON.stringify({ error: 'Invalid Plaid verification key.' }), { status: 401 });
  }
  if ((typeof key.created_at === 'number' && key.created_at > now + 60) || (typeof key.expired_at === 'number' && key.expired_at <= now)) {
    throw new Response(JSON.stringify({ error: 'Expired Plaid verification key.' }), { status: 401 });
  }

  let payload: Awaited<ReturnType<typeof jwtVerify>>['payload'];
  try {
    ({ payload } = await jwtVerify(signedJwt, await importJWK(key, 'ES256'), {
      algorithms: ['ES256'],
      maxTokenAge: '5 minutes',
      clockTolerance: '5 seconds',
    }));
  } catch {
    throw new Response(JSON.stringify({ error: 'Invalid or stale Plaid verification signature.' }), { status: 401 });
  }
  const expectedHash = payload.request_body_sha256;
  const bodyHash = await sha256Hex(rawBody);
  if (typeof expectedHash !== 'string' || !constantTimeEqual(bodyHash, expectedHash.toLowerCase())) {
    throw new Response(JSON.stringify({ error: 'Plaid webhook body verification failed.' }), { status: 401 });
  }
  return bodyHash;
};

const processEvent = async (
  admin: ReturnType<typeof createAdminClient>,
  event: { attempts: number; id: string },
  webhook: PlaidWebhook,
) => {
  if (event.attempts >= 20) return;
  const { data: claimed, error: claimError } = await admin.from('plaid_webhook_events').update({
    status: 'processing',
    attempts: event.attempts + 1,
    claimed_at: new Date().toISOString(),
    next_attempt_at: null,
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', event.id).in('status', ['pending', 'failed']).select('id, attempts').maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return;
  await processClaimedPlaidWebhookEvent(admin, {
    id: claimed.id as string,
    attempts: Number(claimed.attempts),
    payload: webhook,
  });
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const rawBody = await request.text();
    if (rawBody.length === 0 || rawBody.length > 100_000) return json({ error: 'Invalid webhook body.' }, 400);
    const bodyHash = await verifyWebhook(request, rawBody);
    let webhook: PlaidWebhook;
    try {
      webhook = JSON.parse(rawBody) as PlaidWebhook;
    } catch {
      return json({ error: 'Invalid webhook payload.' }, 400);
    }
    if (typeof webhook.webhook_type !== 'string' || typeof webhook.webhook_code !== 'string') {
      return json({ error: 'Invalid webhook payload.' }, 400);
    }

    const admin = createAdminClient();
    const status = typeof webhook.item_id === 'string' ? 'pending' : 'ignored';
    const { error: insertError } = await admin.from('plaid_webhook_events').upsert({
      body_sha256: bodyHash,
      plaid_item_id: typeof webhook.item_id === 'string' ? webhook.item_id : null,
      webhook_type: webhook.webhook_type.slice(0, 80),
      webhook_code: webhook.webhook_code.slice(0, 120),
      payload: webhook,
      status,
      processed_at: status === 'ignored' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'body_sha256', ignoreDuplicates: true });
    if (insertError) throw insertError;

    const { data: event, error: eventError } = await admin
      .from('plaid_webhook_events')
      .select('id, status, attempts')
      .eq('body_sha256', bodyHash)
      .single();
    if (eventError) throw eventError;
    if (event.status === 'pending' || event.status === 'failed') {
      EdgeRuntime.waitUntil(processEvent(admin, event, webhook).catch((caught) => {
        console.error('Plaid webhook background task failed', event.id, errorMessage(caught));
      }));
    }
    return json({ received: true });
  } catch (caught) {
    if (caught instanceof Response) {
      const payload = await caught.json().catch(() => ({ error: 'Webhook verification failed' })) as Record<string, unknown>;
      return json(payload, caught.status);
    }
    if (caught instanceof PlaidApiError) return json({ error: caught.message, code: caught.code }, caught.code === 'PLAID_NOT_CONFIGURED' ? 503 : 502);
    return json({ error: errorMessage(caught) }, 500);
  }
});
