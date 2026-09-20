-- Preserve cash-flow direction and Plaid review metadata while keeping
-- credentials and sync cursors server-only.
alter table public.plaid_items
  add column institution_id text;

alter table public.financial_accounts
  add column plaid_item_id uuid references public.plaid_items(id) on delete cascade,
  add column available_balance numeric(14, 2);

alter table public.transactions
  add column direction text not null default 'outflow'
    check (direction in ('outflow', 'inflow')),
  add column needs_review boolean not null default false,
  add column plaid_category_primary text,
  add column plaid_category_detailed text;

create index financial_accounts_plaid_item_idx
  on public.financial_accounts (plaid_item_id);

create index transactions_user_review_idx
  on public.transactions (user_id, needs_review)
  where needs_review = true;
