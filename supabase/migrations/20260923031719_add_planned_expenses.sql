-- Private one-time expenses with a month-level target and simple covered state.
create table public.planned_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category_id uuid,
  name text not null check (char_length(name) between 1 and 80),
  amount numeric(12, 2) not null check (amount > 0),
  target_month date not null,
  covered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planned_expenses_id_user_id_key unique (id, user_id),
  constraint planned_expenses_target_month_start_check
    check (target_month = date_trunc('month', target_month)::date),
  constraint planned_expenses_category_owner_fkey
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
);

create index planned_expenses_user_target_idx
  on public.planned_expenses (user_id, target_month);

create index planned_expenses_user_uncovered_target_idx
  on public.planned_expenses (user_id, target_month)
  where covered_at is null;

create index planned_expenses_category_owner_idx
  on public.planned_expenses (category_id, user_id);

alter table public.planned_expenses enable row level security;

revoke all on public.planned_expenses from anon, authenticated;
grant select, insert, update, delete on public.planned_expenses to authenticated;
grant select, insert, update, delete on public.planned_expenses to service_role;

create policy "Users can read their planned expenses"
  on public.planned_expenses for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their planned expenses"
  on public.planned_expenses for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their planned expenses"
  on public.planned_expenses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their planned expenses"
  on public.planned_expenses for delete to authenticated
  using ((select auth.uid()) = user_id);
