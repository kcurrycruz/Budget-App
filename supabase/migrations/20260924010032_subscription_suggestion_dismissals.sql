create table public.subscription_suggestion_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  merchant_key text not null check (char_length(merchant_key) between 1 and 160),
  created_at timestamptz not null default now(),
  constraint subscription_suggestion_dismissals_user_merchant_key unique (user_id, merchant_key)
);

alter table public.subscription_suggestion_dismissals enable row level security;

revoke all on public.subscription_suggestion_dismissals from public, anon;
grant select, insert, delete on public.subscription_suggestion_dismissals to authenticated;
grant select, insert, update, delete on public.subscription_suggestion_dismissals to service_role;

create policy "Users can read their dismissed subscription suggestions"
  on public.subscription_suggestion_dismissals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can dismiss their own subscription suggestions"
  on public.subscription_suggestion_dismissals for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can restore their own subscription suggestions"
  on public.subscription_suggestion_dismissals for delete to authenticated
  using ((select auth.uid()) = user_id);
