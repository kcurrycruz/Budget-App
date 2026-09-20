export class PlaidApiError extends Error {
  code: string;
  requestId?: string;

  constructor(message: string, code = 'PLAID_ERROR', requestId?: string) {
    super(message);
    this.name = 'PlaidApiError';
    this.code = code;
    this.requestId = requestId;
  }
}
const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const base64ToBytes = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const encryptionKey = async () => {
  const encoded = Deno.env.get('PLAID_TOKEN_ENCRYPTION_KEY');
  if (!encoded) throw new PlaidApiError('Plaid Sandbox is not configured yet.', 'PLAID_NOT_CONFIGURED');

  let raw: Uint8Array;
  try {
    raw = base64ToBytes(encoded);
  } catch {
    throw new PlaidApiError('The Plaid token encryption key is invalid.', 'PLAID_NOT_CONFIGURED');
  }
  if (raw.byteLength !== 32) {
    throw new PlaidApiError('The Plaid token encryption key must contain 32 bytes.', 'PLAID_NOT_CONFIGURED');
  }
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
};

export async function encryptAccessToken(accessToken: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(),
    new TextEncoder().encode(accessToken),
  );
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptAccessToken(payload: string) {
  const [version, encodedIv, encodedCiphertext] = payload.split('.');
  if (version !== 'v1' || !encodedIv || !encodedCiphertext) {
    throw new PlaidApiError('Stored Plaid credentials could not be read.', 'PLAID_TOKEN_INVALID');
  }
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(encodedIv) },
      await encryptionKey(),
      base64ToBytes(encodedCiphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new PlaidApiError('Stored Plaid credentials could not be read.', 'PLAID_TOKEN_INVALID');
  }
}

const plaidConfiguration = () => {
  const clientId = Deno.env.get('PLAID_CLIENT_ID');
  const secret = Deno.env.get('PLAID_SECRET');
  const environment = Deno.env.get('PLAID_ENV') ?? 'sandbox';
  if (!clientId || !secret || !Deno.env.get('PLAID_TOKEN_ENCRYPTION_KEY')) {
    throw new PlaidApiError('Plaid Sandbox is not configured yet.', 'PLAID_NOT_CONFIGURED');
  }
  if (!['sandbox', 'development', 'production'].includes(environment)) {
    throw new PlaidApiError('The Plaid environment is invalid.', 'PLAID_NOT_CONFIGURED');
  }
  return { clientId, environment, secret };
};

export async function plaidPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { clientId, environment, secret } = plaidConfiguration();
  const response = await fetch(`https://${environment}.plaid.com${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PLAID-CLIENT-ID': clientId,
      'PLAID-SECRET': secret,
      'Plaid-Version': '2020-09-14',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    throw new PlaidApiError(
      typeof payload.error_message === 'string' ? payload.error_message : 'Plaid could not complete the request.',
      typeof payload.error_code === 'string' ? payload.error_code : 'PLAID_ERROR',
      typeof payload.request_id === 'string' ? payload.request_id : undefined,
    );
  }
  return payload as T;
}

export const plaidWebhookUrl = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) throw new PlaidApiError('The Plaid webhook URL is not configured.', 'PLAID_NOT_CONFIGURED');
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/plaid-webhook`;
};

export async function configurePlaidWebhook(accessToken: string) {
  await plaidPost<{ request_id: string }>('/item/webhook/update', {
    access_token: accessToken,
    webhook: plaidWebhookUrl(),
  });
}
