-- Optional detail beneath top-level budget categories. Top-level categories
-- keep the monthly limit while subcategories add transaction granularity.
create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(name) between 1 and 50),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subcategories_id_category_user_key unique (id, category_id, user_id),
  constraint subcategories_user_category_name_key unique (user_id, category_id, name),
  constraint subcategories_category_owner_fkey
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on delete cascade
);

create index subcategories_user_category_active_sort_idx
  on public.subcategories (user_id, category_id, archived_at, sort_order);

create index subcategories_category_owner_idx
  on public.subcategories (category_id, user_id);

alter table public.transactions
  add column subcategory_id uuid,
  add constraint transactions_subcategory_requires_category_check
    check (subcategory_id is null or category_id is not null),
  add constraint transactions_subcategory_owner_fkey
    foreign key (subcategory_id, category_id, user_id)
    references public.subcategories (id, category_id, user_id);

create index transactions_subcategory_owner_idx
  on public.transactions (subcategory_id, category_id, user_id);

alter table public.subcategories enable row level security;

revoke all on public.subcategories from anon, authenticated;
grant select, insert, update on public.subcategories to authenticated;
grant select, insert, update, delete on public.subcategories to service_role;

create policy "Users can read their subcategories"
  on public.subcategories for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their subcategories"
  on public.subcategories for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their subcategories"
  on public.subcategories for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
