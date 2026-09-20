# Project Plan

## Goal

Build a phone-first budget app that makes entering financial information and understanding monthly cash flow easier than maintaining a spreadsheet.

## Product principles

- Make the next useful action obvious.
- Show a monthly answer before detailed analysis.
- Keep manual entry fast even after connected accounts are available.
- Explain financial data in plain language.
- Treat privacy, user consent, and traceable edits as product features.

## First release

- Home view with income, spending, and remaining money.
- Quick manual expense entry with broad categories.
- Transaction activity with search and filters.
- Monthly plan for fixed and flexible spending.
- Plaid account connection for bank and credit-card transactions.
- Review queue for imported transactions that need a category.

## Product decisions to confirm

- Whether the first budgeting model is category limits, zero-based budgeting, or a simpler spend-versus-income plan.
- Which spreadsheet tabs and fields must be migrated into the app.
- Whether recurring bills should be detected automatically or entered manually first.
- Authentication, data-retention, deletion, and support requirements.

## Future feature and UI backlog

The current private beta is a foundation, not a locked final design. Continue adding features and refining the phone UI as real usage reveals what makes budgeting faster and clearer.

- Recurring bills, subscriptions, and expected-income reminders.
- Spreadsheet history import and easier bulk editing.
- Smarter transaction categories and reusable merchant rules.
- More useful cash-flow trends, monthly comparisons, and goal tracking.
- Continued navigation, typography, spacing, accessibility, and visual-polish iterations.
- Native iPhone-specific improvements after the custom development build is introduced.

## Technical direction

- Client: Expo SDK 57 with React Native and TypeScript.
- Mobile platforms: iOS and Android from one codebase.
- Web: export the shared Expo client as an installable PWA for the free private beta.
- Plaid: React Native Link SDK in a custom development build.
- Server: create Link tokens, exchange public tokens, encrypt access tokens, process webhooks, and normalize transactions.
- Data: keep imported transaction identity separate from user edits so syncs never overwrite a correction.

Plaid credentials and access tokens must never be committed or stored in the mobile app.

## Suggested milestones

1. Validate the mobile prototype against the current spreadsheet workflow.
2. Map the spreadsheet data into accounts, categories, budgets, and transactions.
3. Add persistence, authentication, and a secure API.
4. Connect Plaid sandbox and implement transaction sync and review.
5. Test with anonymized data, add automated checks, and ship a private beta.

## Decision log

Record decisions here with the date, decision, and reason. Move longer technical notes into their own files under `docs/` and link them from this section.

- 2026-09-19: The first private beta will support multiple people with completely separate, private budgets. Shared household budgets are deferred until the personal workflow is proven.
- 2026-09-19: Supabase Auth, Postgres, and Row Level Security will provide the first multi-user backend. Plaid credentials remain server-only.
- 2026-09-19: The free private beta will ship as an installable HTTPS web app. Native iOS distribution can follow when an Apple Developer Program membership is justified.
- 2026-09-19: EAS Hosting provides the beta's stable HTTPS production address at `https://kcurry-budget.expo.app`; Supabase Auth uses the same address as its default Site URL.
- 2026-09-20: Imported transactions use an in-app review queue. Choosing a category clears the review flag and updates monthly category totals without changing Plaid's original transaction identity.
- 2026-09-20: Treat the current feature set and UI as the private-beta baseline. Future feature additions and UI changes are explicitly expected rather than constrained by the first release layout.
- 2026-09-20: Manual entry supports both expenses and income, lightweight date and note capture, and explicit save progress. Activity filters must represent real behavior rather than decorative controls.
- 2026-09-20: Money fields use grouped thousands while typing and left-aligned mobile inputs so plan setup remains easy to scan and edit.
- 2026-09-20: Manual transactions can be fully edited or deleted with confirmation. Plaid-imported transactions keep their source details protected and only allow category corrections.
