# Installable web app

The Expo client can be published as a mobile-first web app and added to an iPhone Home Screen without an Apple Developer Program membership.

## Live deployment

- Production app: [https://kcurry-budget.expo.app](https://kcurry-budget.expo.app)
- Expo project: `@kcurrycruz/budget-app-mobile`
- Hosting: EAS Hosting Free plan
- Supabase Auth Site URL: `https://kcurry-budget.expo.app`

## Build and preview

From the repository root:

```powershell
pnpm --dir apps/mobile build:web
pnpm --dir apps/mobile preview:web
eas deploy --prod
```

The production files are generated in `apps/mobile/dist`. The export includes:

- The Expo web bundle.
- A PWA manifest and Home Screen icons.
- iPhone safe-area styling.
- A single-page-app redirect file for compatible static hosts.

The build reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The publishable key is designed for client use; service-role keys, Plaid secrets, and Plaid access tokens must never use the `EXPO_PUBLIC_` prefix or appear in this bundle.

## Hosting configuration

EAS Hosting serves the exported `apps/mobile/dist` bundle over HTTPS. The production address remains stable while each deployment is immutable, allowing a previous deployment to be promoted again if a release needs to be rolled back.

Any replacement host must provide:

- HTTPS enabled.
- All unknown paths rewritten to `/index.html` with a successful response.
- `manifest.json` served as JSON.
- No caching rule that prevents new releases from reaching users.

The committed `public/_redirects` file configures the rewrite automatically on hosts that support Netlify-style redirects. EAS Hosting reads the Expo single-page export directly.

## Install on iPhone

1. Open [https://kcurry-budget.expo.app](https://kcurry-budget.expo.app) in Safari.
2. Tap the Share button.
3. Choose **Add to Home Screen**.
4. Confirm the name **Budget**, then tap **Add**.

The app opens in a standalone window and continues to use the same private Supabase account and data as other devices.

## Plaid direction

Use Plaid Link for Web in Safari for the free web beta. The server creates Link tokens, exchanges public tokens, stores access tokens, and syncs transactions. When native iOS distribution is added, the UI adapter can switch to Plaid's React Native SDK without changing the server or normalized budget data.

Plaid Sandbox uses test institutions and test data. Production bank connections require a separate Plaid production review and should not be enabled until the Sandbox flow, transaction review, and account deletion behavior are verified.
