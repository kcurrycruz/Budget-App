-- Private, dated deposits for savings goals. The existing current_amount on
-- savings_goals remains the starting balance; the app adds these rows to it.
create table public.savings_goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  savings_goal_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  note text check (note is null or char_length(note) between 1 and 160),
  contributed_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint savings_goal_contributions_goal_owner_fkey
    foreign key (savings_goal_id, user_id)
    references public.savings_goals (id, user_id)
    on delete cascade
);

create index savings_goal_contributions_owner_goal_date_idx
  on public.savings_goal_contributions (user_id, savings_goal_id, contributed_on desc, created_at desc);

alter table public.savings_goal_contributions enable row level security;

revoke all on public.savings_goal_contributions from anon, authenticated;
grant select, insert, delete on public.savings_goal_contributions to authenticated;
grant select, insert, update, delete on public.savings_goal_contributions to service_role;

create policy "Users can read their savings goal contributions"
  on public.savings_goal_contributions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their savings goal contributions"
  on public.savings_goal_contributions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their savings goal contributions"
  on public.savings_goal_contributions for delete to authenticated
  using ((select auth.uid()) = user_id);
