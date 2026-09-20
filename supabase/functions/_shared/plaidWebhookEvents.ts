import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';

import { errorMessage } from './http.ts';
import { decryptAccessToken, PlaidApiError } from './plaid.ts';
import { syncPlaidItem, type PlaidItemRow } from './sync.ts';

export type PlaidWebhook = {
  error?: { error_code?: unknown; error_message?: unknown } | null;
  item_id?: unknown;
  webhook_code?: unknown;
  webhook_type?: unknown;
};

export type ClaimedWebhookEvent = {
  attempts: number;
  id: string;
  payload: PlaidWebhook;
};

const retryAt = (attempts: number) => {
  if (attempts >= 20) return null;
  const delayMinutes = Math.min(2 ** Math.max(0, attempts - 1), 360);
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
};

const finishEvent = async (
  admin: SupabaseClient,
  event: Pick<ClaimedWebhookEvent, 'attempts' | 'id'>,
  status: 'processed' | 'ignored' | 'failed',
  lastError: string | null = null,
) => {
  const completed = status === 'processed' || status === 'ignored';
  const { error } = await admin.from('plaid_webhook_events').update({
    status,
    last_error: lastError,
    claimed_at: null,
    next_attempt_at: status === 'failed' ? retryAt(event.attempts) : null,
    processed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('id', event.id);
  if (error) console.error('Could not finish Plaid webhook event', event.id, error.message);
};

const markConnectionAttention = async (
  admin: SupabaseClient,
  item: { id: string },
  message: string,
  loginRequired = false,
) => {
  const now = new Date().toISOString();
  const updates = [
    admin.from('financial_accounts').update({ connection_status: 'attention', updated_at: now }).eq('plaid_item_id', item.id),
    admin.from('plaid_sync_state').update({ last_error: message.slice(0, 500), updated_at: now }).eq('plaid_item_id', item.id),
  ];
  if (loginRequired) {
    updates.push(admin.from('plaid_items').update({ status: 'login_required', updated_at: now }).eq('id', item.id));
  }
  const results = await Promise.all(updates);
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw failure;
};

export const processClaimedPlaidWebhookEvent = async (
  admin: SupabaseClient,
  event: ClaimedWebhookEvent,
) => {
  const webhook = event.payload;
  try {
    if (typeof webhook.item_id !== 'string') {
      await finishEvent(admin, event, 'ignored');
      return;
    }
    const { data: item, error } = await admin
      .from('plaid_items')
      .select('id, user_id, institution_name, access_token_ciphertext, status')
      .eq('plaid_item_id', webhook.item_id)
      .maybeSingle();
    if (error) throw error;
    if (!item || item.status === 'disconnected') {
      await finishEvent(admin, event, 'ignored');
      return;
    }

    if (webhook.webhook_type === 'TRANSACTIONS' && webhook.webhook_code === 'SYNC_UPDATES_AVAILABLE') {
      await syncPlaidItem(admin, item as PlaidItemRow, await decryptAccessToken(item.access_token_ciphertext as string));
      const { error: updateError } = await admin
        .from('plaid_items')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (updateError) throw updateError;
      await finishEvent(admin, event, 'processed');
      return;
    }

    if (webhook.webhook_type === 'ITEM' && ['ERROR', 'PENDING_EXPIRATION', 'USER_PERMISSION_REVOKED'].includes(String(webhook.webhook_code))) {
      const detail = typeof webhook.error?.error_message === 'string'
        ? webhook.error.error_message
        : `Plaid reported ${String(webhook.webhook_code).toLowerCase().replaceAll('_', ' ')}.`;
      await markConnectionAttention(admin, item, detail, true);
      await finishEvent(admin, event, 'processed');
      return;
    }

    await finishEvent(admin, event, 'ignored');
  } catch (caught) {
    const message = errorMessage(caught);
    if (typeof webhook.item_id === 'string') {
      const { data: item } = await admin.from('plaid_items').select('id').eq('plaid_item_id', webhook.item_id).maybeSingle();
      const loginRequired = caught instanceof PlaidApiError && caught.code === 'ITEM_LOGIN_REQUIRED';
      if (item && (loginRequired || event.attempts >= 5)) {
        await markConnectionAttention(admin, item, message, loginRequired).catch(() => undefined);
      }
    }
    if (event.attempts >= 5) {
      console.error('Repeated Plaid webhook processing failure', event.id, `attempt=${event.attempts}`, message);
    }
    await finishEvent(admin, event, 'failed', message.slice(0, 500));
  }
};
