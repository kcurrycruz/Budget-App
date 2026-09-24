-- Preserve each category's plan by month instead of overwriting one global limit.
create table public.category_month_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category_id uuid not null,
  month date not null,
  monthly_limit numeric(12, 2) not null default 0 check (monthly_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_month_budgets_user_category_month_key unique (user_id, category_id, month),
  constraint category_month_budgets_category_owner_fkey
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on delete cascade,
  check (month = date_trunc('month', month)::date)
);

create index category_month_budgets_user_month_idx
  on public.category_month_budgets (user_id, month, category_id);

alter table public.category_month_budgets enable row level security;

revoke all on public.category_month_budgets from public, anon;
grant select, insert, update, delete on public.category_month_budgets to authenticated;
grant select, insert, update, delete on public.category_month_budgets to service_role;

create policy "Users can read their category month budgets"
  on public.category_month_budgets for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their category month budgets"
  on public.category_month_budgets for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their category month budgets"
  on public.category_month_budgets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their category month budgets"
  on public.category_month_budgets for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Keep every existing user's current plan intact during the migration.
insert into public.category_month_budgets (user_id, category_id, month, monthly_limit)
select user_id, id, date_trunc('month', current_date)::date, monthly_limit
from public.categories
on conflict (user_id, category_id, month) do nothing;
