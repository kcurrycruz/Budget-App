create table public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  snapshot_month date not null,
  assets numeric(14, 2) not null default 0 check (assets >= 0),
  debts numeric(14, 2) not null default 0 check (debts >= 0),
  net_worth numeric(14, 2) generated always as (assets - debts) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint net_worth_snapshots_month_start_check
    check (snapshot_month = date_trunc('month', snapshot_month)::date),
  constraint net_worth_snapshots_user_month_key unique (user_id, snapshot_month)
);

alter table public.net_worth_snapshots enable row level security;

revoke all on table public.net_worth_snapshots from anon;
grant select, insert, update on table public.net_worth_snapshots to authenticated;
grant select, insert, update, delete on table public.net_worth_snapshots to service_role;

create policy "Users can read their net worth history"
  on public.net_worth_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their net worth history"
  on public.net_worth_snapshots for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their net worth history"
  on public.net_worth_snapshots for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
