-- Private, per-user foundation for Budget App 2.
-- Apply this migration from the Supabase dashboard or CLI before enabling cloud mode.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  month date not null,
  expected_income numeric(12, 2) not null default 0 check (expected_income >= 0),
  fixed_costs numeric(12, 2) not null default 0 check (fixed_costs >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month),
  check (month = date_trunc('month', month)::date)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  color text not null default '#5A9E91',
  icon text not null default 'dots-horizontal-circle-outline',
  monthly_limit numeric(12, 2) not null default 0 check (monthly_limit >= 0),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  plaid_account_id text unique,
  display_name text not null,
  institution_name text,
  mask text,
  account_type text not null check (account_type in ('checking', 'savings', 'credit', 'loan', 'investment', 'other')),
  current_balance numeric(14, 2),
  currency_code text not null default 'USD',
  last_synced_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  financial_account_id uuid references public.financial_accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  plaid_transaction_id text unique,
  merchant_name text not null check (char_length(merchant_name) between 1 and 160),
  amount numeric(12, 2) not null check (amount >= 0),
  transaction_date date not null default current_date,
  pending boolean not null default false,
  source text not null default 'manual' check (source in ('manual', 'plaid')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- These two tables intentionally have no client policies. Only trusted server
-- functions using the service role may read or modify Plaid credentials/state.
create table public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plaid_item_id text not null unique,
  access_token_ciphertext text not null,
  institution_name text,
  status text not null default 'active' check (status in ('active', 'login_required', 'disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plaid_sync_state (
  plaid_item_id uuid primary key references public.plaid_items(id) on delete cascade,
  next_cursor text,
  last_synced_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc);
create index transactions_category_idx on public.transactions (category_id);
create index transactions_financial_account_idx on public.transactions (financial_account_id);
create index financial_accounts_user_idx on public.financial_accounts (user_id);
create index categories_user_sort_idx on public.categories (user_id, sort_order);
create index plaid_items_user_idx on public.plaid_items (user_id);

alter table public.profiles enable row level security;
alter table public.budget_months enable row level security;
alter table public.categories enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.plaid_items enable row level security;
alter table public.plaid_sync_state enable row level security;

-- Data API privileges are explicit because the project keeps automatic table
-- exposure disabled. RLS remains the final authorization boundary.
revoke all on public.profiles, public.budget_months, public.categories,
  public.financial_accounts, public.transactions, public.plaid_items,
  public.plaid_sync_state from anon;
grant usage on schema public to authenticated, service_role;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.budget_months to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.financial_accounts to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
revoke all on public.plaid_items from anon, authenticated;
revoke all on public.plaid_sync_state from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.budget_months,
  public.categories, public.financial_accounts, public.transactions,
  public.plaid_items, public.plaid_sync_state to service_role;

create policy "Users can read their profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can read their budget months"
  on public.budget_months for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their budget months"
  on public.budget_months for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their budget months"
  on public.budget_months for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their budget months"
  on public.budget_months for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their categories"
  on public.categories for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their categories"
  on public.categories for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their categories"
  on public.categories for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their categories"
  on public.categories for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their accounts"
  on public.financial_accounts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their accounts"
  on public.financial_accounts for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their accounts"
  on public.financial_accounts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their accounts"
  on public.financial_accounts for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their transactions"
  on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their transactions"
  on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their transactions"
  on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their transactions"
  on public.transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.budget_months (user_id, month)
  values (new.id, date_trunc('month', current_date)::date);

  insert into public.categories (user_id, name, color, icon, sort_order)
  values
    (new.id, 'Home', '#5C7CFA', 'home-variant-outline', 10),
    (new.id, 'Food', '#E98A4C', 'silverware-fork-knife', 20),
    (new.id, 'Transport', '#A16AE8', 'car-outline', 30),
    (new.id, 'Fun', '#D65D7A', 'ticket-outline', 40),
    (new.id, 'Other', '#5A9E91', 'dots-horizontal-circle-outline', 50);

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated, service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();
