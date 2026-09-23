-- Private savings goals with a target, current balance, and month-level deadline.
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  target_amount numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  target_month date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint savings_goals_id_user_id_key unique (id, user_id),
  constraint savings_goals_target_month_start_check
    check (target_month = date_trunc('month', target_month)::date)
);

create index savings_goals_user_target_idx
  on public.savings_goals (user_id, target_month);

alter table public.savings_goals enable row level security;

revoke all on public.savings_goals from anon, authenticated;
grant select, insert, update, delete on public.savings_goals to authenticated;
grant select, insert, update, delete on public.savings_goals to service_role;

create policy "Users can read their savings goals"
  on public.savings_goals for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their savings goals"
  on public.savings_goals for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their savings goals"
  on public.savings_goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their savings goals"
  on public.savings_goals for delete to authenticated
  using ((select auth.uid()) = user_id);
