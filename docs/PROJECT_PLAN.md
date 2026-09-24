# Project Plan

## Goal

Build a phone-first budget app that makes entering financial information and understanding monthly cash flow easier than maintaining a spreadsheet.

Product name: **Zenify**. Brand promise: **Unifying all finances in one place to reach your financial goals.**

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
- Recurring bills can be entered manually, while stable monthly transaction patterns appear as optional review-first suggestions.
- Authentication, data-retention, deletion, and support requirements.

## Future feature and UI backlog

The current private beta is a foundation, not a locked final design. Continue adding features and refining the phone UI as real usage reveals what makes budgeting faster and clearer.

- Recurring bills, subscriptions, and expected-income reminders.
- Spreadsheet history import and easier bulk editing.
- Smarter transaction categories and reusable merchant rules.
- More useful cash-flow trends, monthly comparisons, and goal tracking.
- Continued navigation, typography, spacing, accessibility, and visual-polish iterations.
- Native iPhone-specific improvements after the custom development build is introduced.

## User-research roadmap

The [Budget App Suggestions discussion](https://www.reddit.com/r/budget/comments/1grz201/budget_app_suggestions/) reinforces one core product opportunity: people want connected transaction tracking and capable budgeting in one place, but they do not want a steep learning curve or an interface that constantly rearranges itself.

The app will cover the thread's requests through progressive disclosure: the default experience stays focused on **This month**, while deeper controls live behind the relevant category, transaction, bill, account, or report.

### Now — make the monthly routine complete

- Track recurring bills and subscriptions, their due days, and whether each is paid this month.
- Show upcoming bills on Home without double-counting the fixed-cost plan.
- Keep both Plaid-connected and fast manual transactions.
- Keep category limits visible and clearly flag overspending.

### Next — customization without clutter

- Category organization is now complete: users can create, rename, recolor, reorder, archive, and restore categories without deleting transaction history.
- Optional subcategories are now available for people who want granularity; broad categories remain the default.
- Add reusable merchant rules so corrected transactions stay categorized the user's way.
- Planned one-time expenses are now available alongside recurring bills, with a target month, optional category, suggested monthly set-aside, and covered state.
- Add optional Needs, Wants, Giving, Saving/Investing, and Personal tags across any category.

### Then — one useful financial picture

- A simple cash-flow report is now available inside Plan, combining expected and received income, actual spending, one-time set-asides, budget totals, and remaining availability.
- Month-to-date spending now includes a comparison with the same point last month plus editable Needs, Wants, and Savings percentage views.
- Savings goals now include dated contribution history inside Plan, alongside progress, target dates, and a suggested monthly pace. Accounts now includes a connected-balance net-worth snapshot. Add sinking-fund automation and net-worth history without putting them on the primary Home screen.
- Spreadsheet data is now portable from Account settings: users can export the current month as a clean CSV and preview validated CSV rows before importing them. Add flexible column mapping and full-history exports later.

### Later — households and power tools

- Add shared household budgets with roles and personal spending areas after the private single-user model is proven.
- Add customizable dashboards and deeper analytics as opt-in tools, never as required setup.
- Consider light motivational progress and achievements only if they help habits without distracting from the numbers.

### Simplicity guardrails

- No more than four primary navigation destinations.
- One prominent action per screen.
- Advanced features are optional and appear only where their context is clear.
- User-created organization wins over automatic guesses; automation must be easy to correct.
- Layout and navigation stay stable between sessions.

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
- 2026-09-20: Reddit user research is translated into a progressive roadmap rather than a crowded all-at-once interface. The default product remains a simple monthly overview, with subcategories, rules, reports, goals, net worth, and household sharing introduced contextually in phases.
- 2026-09-21: Rename the product to Zenify and use the supplied shooting-star mark. Keep the existing hosting slug and native identifiers stable until a dedicated production migration is planned.
- 2026-09-21: Keep budgets attached to broad categories while optional subcategories add transaction detail. This prevents double-counting and keeps the monthly plan easy to scan.
- 2026-09-23: Planned one-time expenses use a month-level target and a calculated monthly set-aside. Uncovered set-asides reduce the displayed monthly buffer and available amount without creating a transaction or changing category spending.
- 2026-09-23: The first cash-flow report stays inside Plan to preserve the four-tab navigation. It separates actual transactions from budget targets and explains that planned set-asides do not create transactions.
- 2026-09-23: Month-to-month spending compares the current month through today's date with the same period last month so partial months are not measured against completed months.
- 2026-09-23: Needs, Wants, and Savings are stored as an editable group on each category. Percentages use categorized spending only, keeping the report transparent when uncategorized transactions still need review.
- 2026-09-23: Savings goals stay inside Plan and track a target, current saved balance, and target month. The remaining balance creates a monthly goal pace that participates in the plan buffer, while edits remain manual until transaction-linked contributions are introduced.
- 2026-09-23: Home greets each person by the first name on their account, derives the avatar initials from that name, and shows the current month as a compact overview label instead of a generic “Your September” title.
- 2026-09-23: Primary tab changes use a short directional fade-and-slide plus a small selected-icon lift. The motion remains subtle, preserves the stable four-tab layout, and respects the device’s Reduce Motion preference.
- 2026-09-23: Savings-goal deposits are stored as private dated contribution records. The original saved amount remains a starting balance, contribution totals are calculated on read, and deleting a contribution reverses only that entry without rewriting the goal’s history.
- 2026-09-23: Accounts shows an estimated net worth from connected balances only. Cash and investment accounts count toward assets, credit and loan balances count toward debt, and negative cash balances are treated as debt so the summary remains conservative.
- 2026-09-23: Account settings includes a CSV round-trip for transactions. Zenify validates required fields, skips exact duplicates, limits each import to 500 rows, and sends unknown expense categories to the Review queue instead of guessing.
- 2026-09-24: Home shows a compact monthly-insights card only when spending exists. It prioritizes overspending, month-to-month direction, and the largest category while keeping deeper analysis inside the cash-flow report.
- 2026-09-24: Subscription detection only suggests merchants with at least two stable charges 20–40 days apart. Zenify never creates a recurring bill automatically; the user reviews every suggestion, and dismissed suggestions remain private to that account.
- 2026-09-24: Category order persists privately across devices. Archiving is a reversible soft hide that removes a category from plans and new entries while preserving its label on historical Activity; at least one active category is always required.
