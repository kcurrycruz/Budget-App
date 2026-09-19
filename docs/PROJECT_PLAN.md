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
- Whether the first private beta is only for one person or supports invited friends with separate accounts.
- Which spreadsheet tabs and fields must be migrated into the app.
- Whether recurring bills should be detected automatically or entered manually first.
- Authentication, data-retention, deletion, and support requirements.

## Technical direction

- Client: Expo SDK 57 with React Native and TypeScript.
- Mobile platforms: iOS and Android from one codebase.
- Web: reuse domain types and design tokens after the mobile workflow is proven.
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
