# Zenify

A phone-first finance app that unifies spending, budgeting, bills, and cash-flow visibility while staying simpler than a spreadsheet.

## Project status

The authenticated budget foundation is working with private Supabase-backed data, editable monthly plans, manual transactions, exports, and account controls. The same Expo client now exports as an installable mobile web app while Plaid Sandbox integration is prepared. Product decisions, architecture notes, and milestones belong in [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md).

Live private beta: [kcurry-budget.expo.app](https://kcurry-budget.expo.app)

## Repository layout

```text
.
|-- apps/mobile/       Expo and React Native mobile app
|-- docs/              Product plans and technical notes
|-- .editorconfig      Shared editor defaults
|-- .gitignore         Files that should stay local
|-- CONTRIBUTING.md    Branch, commit, and review workflow
`-- README.md          Project overview
```

The Expo app serves iOS, Android, and web from one codebase. Secrets and future Plaid access tokens stay in server-side Supabase functions, never in a client bundle.

## Getting started

1. Install the mobile dependencies with `pnpm --dir apps/mobile install`.
2. Start the app with `pnpm --dir apps/mobile start`.
3. Open it in a simulator or an Expo development build.

For the installable web version:

1. Create a production bundle with `pnpm --dir apps/mobile build:web`.
2. Preview it with `pnpm --dir apps/mobile preview:web`.
3. Deploy `apps/mobile/dist` to EAS Hosting with `eas deploy --prod`.

See [`docs/WEB_APP.md`](docs/WEB_APP.md) for deployment requirements and iPhone installation steps.

The web beta includes Plaid Link with server-generated tokens, encrypted server-side access-token storage, and Sandbox transaction syncing. Plaid's native React Native SDK is not supported in Expo Go, so the native connection flow will arrive with the custom development build; the installable web app works in iPhone Safari now.

## Multi-user cloud setup

The app includes a Supabase-ready sign-up and sign-in flow plus a Row Level Security migration. Without Supabase environment variables it intentionally runs in preview mode. Follow [`docs/MULTI_USER_SETUP.md`](docs/MULTI_USER_SETUP.md) to connect a cloud project safely.

## Working agreement

- Keep `main` stable.
- Use focused branches and pull requests for changes.
- Never commit credentials, API keys, personal financial data, or local environment files.
- Record meaningful product or architecture decisions in `docs/`.
