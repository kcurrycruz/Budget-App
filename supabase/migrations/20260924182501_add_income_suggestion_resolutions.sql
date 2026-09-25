-- Remember each user's decision about a Plaid-derived recurring-income pattern.
-- Suggestions remain review-first and never change a monthly plan on their own.
create table public.income_suggestion_resolutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  suggestion_key text not null check (char_length(suggestion_key) between 1 and 160),
  resolution text not null check (resolution in ('accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint income_suggestion_resolutions_user_key unique (user_id, suggestion_key)
);

-- The unique constraint supports user/key lookups and user cleanup through the FK.
alter table public.income_suggestion_resolutions enable row level security;

revoke all on public.income_suggestion_resolutions from public, anon;
grant select, insert, update on public.income_suggestion_resolutions to authenticated;
grant select, insert, update, delete on public.income_suggestion_resolutions to service_role;

create policy "Users can read their income suggestion decisions"
  on public.income_suggestion_resolutions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their income suggestion decisions"
  on public.income_suggestion_resolutions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their income suggestion decisions"
  on public.income_suggestion_resolutions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
