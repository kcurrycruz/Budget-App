# Plaid Sandbox integration

The web beta now contains the complete connection boundary: authenticated Link-token creation, Plaid Link for web, one-time public-token exchange, AES-GCM encrypted access-token storage, account import, and incremental `/transactions/sync` support. It stays in Sandbox until the workflow and categorization UX are proven.

## Client responsibilities

- Ask the API for a short-lived Link token.
- Open Plaid Link in the installable web app.
- Send the returned public token to the API.
- Show connection, sync, and re-authentication states.
- Never receive or store a Plaid access token.

## Server responsibilities

- Create Link tokens with the minimum required Plaid products.
- Exchange public tokens for access tokens.
- Encrypt access tokens at rest and never return them to the client.
- Fetch and normalize account, balance, and transaction data.
- Apply transaction changes incrementally with a per-Item cursor.
- Support item errors, update mode, disconnect, export, and deletion.

## Initial product choice

Start with Transactions for spending and cash-flow visibility. Add other Plaid products only when a specific user workflow requires them. This keeps consent clearer, Link faster, and costs easier to understand.

## Required Supabase function secrets

- `PLAID_CLIENT_ID`: Plaid Dashboard client ID.
- `PLAID_SECRET`: Plaid Sandbox secret.
- `PLAID_ENV`: `sandbox` while testing.
- `PLAID_TOKEN_ENCRYPTION_KEY`: a base64-encoded random 32-byte key used only by Edge Functions.

Generate the encryption key locally with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`, then store it directly in Supabase Edge Function secrets. Never commit any of these values.

Sandbox Link uses test data only. Plaid's standard Sandbox credential is `user_good` with password `pass_good`; see the current [Plaid Sandbox documentation](https://plaid.com/docs/sandbox/) before testing.

## Platform note

Plaid Link for web runs in supported iPhone browsers and is used by the installable web beta. Plaid's React Native SDK contains native code and does not run in Expo Go, so a custom Expo development build is still required before the same flow can be added to the native binary.

## Next hardening milestone

Add a verified Plaid webhook endpoint for automatic background sync, Link update mode for expired credentials, and an explicit disconnect flow that calls `/item/remove` before deleting local connection records.
