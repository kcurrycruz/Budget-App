alter table public.planned_expenses
  add column auto_fund boolean not null default false;

create table public.planned_expense_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  planned_expense_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  contribution_month date not null,
  created_at timestamptz not null default now(),
  constraint planned_expense_contributions_month_start_check
    check (contribution_month = date_trunc('month', contribution_month)::date),
  constraint planned_expense_contributions_expense_month_key
    unique (planned_expense_id, contribution_month),
  constraint planned_expense_contributions_expense_owner_fkey
    foreign key (planned_expense_id, user_id)
    references public.planned_expenses (id, user_id)
    on delete cascade
);

create index planned_expense_contributions_user_month_idx
  on public.planned_expense_contributions (user_id, contribution_month desc);

alter table public.planned_expense_contributions enable row level security;

revoke all on table public.planned_expense_contributions from anon, authenticated;
grant select, insert on table public.planned_expense_contributions to authenticated;
grant select, insert, update, delete on table public.planned_expense_contributions to service_role;

create policy "Users can read their planned expense contributions"
  on public.planned_expense_contributions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their planned expense contributions"
  on public.planned_expense_contributions for insert to authenticated
  with check ((select auth.uid()) = user_id);
