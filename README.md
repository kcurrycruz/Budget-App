# Budget App 2

A phone-first budget app that makes expense entry, monthly planning, and cash-flow visibility feel simpler than a spreadsheet.

## Project status

The first mobile prototype is under active development. It uses sample data until the source spreadsheet is mapped and Plaid's sandbox is connected. Product decisions, architecture notes, and milestones belong in [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md).

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

The mobile app is the first client. A shared API and web client can be added later without placing secrets or Plaid access tokens in the mobile bundle.

## Getting started

1. Install the mobile dependencies with `pnpm --dir apps/mobile install`.
2. Start the app with `pnpm --dir apps/mobile start`.
3. Open it in a simulator or an Expo development build.

Plaid's native React Native SDK is not supported in Expo Go. The current prototype uses a safe connection placeholder; the real integration will use a custom development build and a server-generated Link token.

## Multi-user cloud setup

The app includes a Supabase-ready sign-up and sign-in flow plus a Row Level Security migration. Without Supabase environment variables it intentionally runs in preview mode. Follow [`docs/MULTI_USER_SETUP.md`](docs/MULTI_USER_SETUP.md) to connect a cloud project safely.

## Working agreement

- Keep `main` stable.
- Use focused branches and pull requests for changes.
- Never commit credentials, API keys, personal financial data, or local environment files.
- Record meaningful product or architecture decisions in `docs/`.
