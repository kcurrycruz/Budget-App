# Plaid integration

The web beta now contains the complete connection boundary: authenticated Link-token creation, Plaid Link for web, one-time public-token exchange, AES-GCM encrypted access-token storage, account import, and incremental `/transactions/sync` support. It stays in Sandbox until Plaid grants Production access and the launch checklist is complete.

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
- `PLAID_REDIRECT_URI`: the exact registered HTTPS return URL for mobile OAuth (`https://kcurry-budget.expo.app/` in production). Do not include query parameters or fragments.

Generate the encryption key locally with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`, then store it directly in Supabase Edge Function secrets. Never commit any of these values.

Sandbox Link uses test data only. Plaid's standard Sandbox credential is `user_good` with password `pass_good`; see the current [Plaid Sandbox documentation](https://plaid.com/docs/sandbox/) before testing.

## Platform note

Plaid Link for web runs in supported iPhone browsers and is used by the installable web beta. Plaid's React Native SDK contains native code and does not run in Expo Go, so a custom Expo development build is still required before the same flow can be added to the native binary.

Mobile OAuth returns reuse the original short-lived Link token from browser storage and pass the full `oauth_state_id` return URL back to Plaid. The stored Link session expires locally after three hours and is removed after success, exit, or an error. Add the exact redirect URI to Plaid Dashboard before setting the server secret.

## Connection lifecycle

- Account settings launch Link update mode with the existing server-side access token. The token is unchanged and no public-token exchange is repeated.
- Disconnect calls Plaid `/item/remove` first, then replaces the stored credential with an unusable encrypted marker and marks every account from that Item as disconnected.
- Imported transactions are retained after disconnect so past budgets do not change unexpectedly.

## Automatic updates

- New Items register the hosted `plaid-webhook` endpoint, and existing Items are registered again during manual sync or connection repair.
- The endpoint verifies Plaid's ES256 signature, five-minute freshness window, and exact raw-body SHA-256 before accepting an event.
- Verified events are stored in a server-only receipt table. Transaction update events run incremental sync in a Supabase background task, while Item errors flag the connection for repair in the app.
- Failed processing is retried every five minutes with exponential backoff. Queue claims use row locking to prevent duplicates, the scheduler credential is generated inside Supabase Vault, and repeated failures flag the affected connection and write an operational error log.
- Daily maintenance keeps successful or ignored receipts for 30 days, terminal failures for 90 days, and Cron run history for 7 days. Deletes are indexed and bounded to keep maintenance transactions short.

## Next hardening milestone

Before moving Plaid out of Sandbox:

1. Complete the Plaid application/company profile and security questionnaire, then request Production access.
2. Register `https://kcurry-budget.expo.app/` as an allowed redirect URI and verify OAuth test cases on iPhone Safari and the Home Screen install.
3. Publish customer-facing privacy, data-retention, and support pages linked from Zenify and the Plaid application profile.
4. Add production monitoring and alert delivery for Link exits, API failures, webhook backlog, and repeated sync failures.
5. Replace the Sandbox secret with the Production secret and set `PLAID_ENV=production` only after a final test and rollback review.

Supabase leaked-password screening can be enabled after upgrading from the Free plan; the app already requires at least eight characters for new account passwords.
