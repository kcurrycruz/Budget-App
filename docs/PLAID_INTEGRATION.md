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

## Connection lifecycle

- Account settings launch Link update mode with the existing server-side access token. The token is unchanged and no public-token exchange is repeated.
- Disconnect calls Plaid `/item/remove` first, then replaces the stored credential with an unusable encrypted marker and marks every account from that Item as disconnected.
- Imported transactions are retained after disconnect so past budgets do not change unexpectedly.

## Automatic updates

- New Items register the hosted `plaid-webhook` endpoint, and existing Items are registered again during manual sync or connection repair.
- The endpoint verifies Plaid's ES256 signature, five-minute freshness window, and exact raw-body SHA-256 before accepting an event.
- Verified events are stored in a server-only receipt table. Transaction update events run incremental sync in a Supabase background task, while Item errors flag the connection for repair in the app.

## Next hardening milestone

Add a scheduled recovery worker for verified webhook events that remain failed after the background task limit, plus operational alerting for repeated failures.
