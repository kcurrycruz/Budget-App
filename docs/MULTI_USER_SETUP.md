# Multi-user setup

The app now has an authentication boundary and a private per-user database schema. It stays in preview mode until a Supabase project is connected, so local development remains usable without credentials.

## Connect Supabase

1. Create a Supabase project for the app.
2. Apply the tracked migrations in [`../supabase/migrations/`](../supabase/migrations/) in timestamp order.
3. Copy `apps/mobile/.env.example` to `apps/mobile/.env`.
4. Add the project's URL and publishable key to `apps/mobile/.env`.
5. Restart Expo so it loads the new environment variables.

Only the URL and publishable client key belong in the Expo environment file. Never add a Supabase secret/service-role key, Plaid secret, or Plaid access token to the mobile app.

## Privacy model

- Every user-owned row has a `user_id`.
- Row Level Security compares `user_id` with the signed-in user's ID.
- Plaid credential and sync tables have no mobile-client policies. They are server-only.
- Deleting an authentication user cascades through their profile and budget data.

## Next implementation slice

1. Add Plaid sandbox functions now that the server boundary is deployed.
2. Add automatic category suggestions and a review queue for imported transactions.

The app already reads each signed-in user's monthly plan, categories, accounts, and transactions from Supabase. Manual expenses are saved to the database, and a new user receives a first-time monthly-plan setup screen.

Account settings include a Row Level Security-scoped data export and an authenticated `delete-account` Edge Function. The function determines the target user from the caller's verified access token; the mobile app never receives a service-role key.
