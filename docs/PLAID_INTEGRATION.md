# Plaid integration boundary

## Mobile responsibilities

- Ask the API for a short-lived Link token.
- Open Plaid Link in a custom Expo development build.
- Send the returned public token to the API.
- Show connection, sync, and re-authentication states.

## Server responsibilities

- Create Link tokens with the minimum required Plaid products.
- Exchange public tokens for access tokens.
- Encrypt access tokens at rest and never return them to the client.
- Fetch and normalize account, balance, and transaction data.
- Verify and process Plaid webhooks idempotently.
- Support item errors, update mode, disconnect, export, and deletion.

## Initial product choice

Start with Transactions for spending and cash-flow visibility. Add other Plaid products only when a specific user workflow requires them. This keeps consent clearer, Link faster, and costs easier to understand.

## Development note

Plaid's React Native SDK contains native code and does not run in Expo Go. Use a custom Expo development build after the local prototype is approved.
