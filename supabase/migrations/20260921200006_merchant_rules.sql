-- Private merchant-to-category rules. A rule is created when a user asks
-- Zenify to remember a Plaid transaction correction for future syncs.
create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  merchant_name text not null check (char_length(merchant_name) between 1 and 160),
  merchant_key text not null check (char_length(merchant_key) between 1 and 160),
  category_id uuid not null,
  subcategory_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchant_rules_normalized_key_check
    check (merchant_key = lower(regexp_replace(btrim(merchant_name), '[[:space:]]+', ' ', 'g'))),
  constraint merchant_rules_user_key_key unique (user_id, merchant_key),
  constraint merchant_rules_category_owner_fkey
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on delete cascade,
  constraint merchant_rules_subcategory_owner_fkey
    foreign key (subcategory_id, category_id, user_id)
    references public.subcategories (id, category_id, user_id)
    on delete cascade
);

create index merchant_rules_category_owner_idx
  on public.merchant_rules (category_id, user_id);

create index merchant_rules_subcategory_owner_idx
  on public.merchant_rules (subcategory_id, category_id, user_id);

alter table public.merchant_rules enable row level security;

revoke all on public.merchant_rules from anon, authenticated;
grant select, insert, update, delete on public.merchant_rules to authenticated;
grant select, insert, update, delete on public.merchant_rules to service_role;

create policy "Users can read their merchant rules"
  on public.merchant_rules for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their merchant rules"
  on public.merchant_rules for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their merchant rules"
  on public.merchant_rules for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their merchant rules"
  on public.merchant_rules for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Keep the category correction and its optional rule in one transaction so
-- the app never saves one without the other. This remains SECURITY INVOKER;
-- the caller's table grants and RLS policies are always enforced.
create or replace function public.categorize_transaction(
  p_transaction_id uuid,
  p_category_id uuid,
  p_subcategory_id uuid default null,
  p_remember_merchant boolean default false
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_merchant_name text;
  v_merchant_key text;
  v_source text;
begin
  update public.transactions
  set
    category_id = p_category_id,
    subcategory_id = p_subcategory_id,
    needs_review = false,
    updated_at = now()
  where id = p_transaction_id
    and user_id = (select auth.uid())
    and direction = 'outflow'
  returning merchant_name, source into v_merchant_name, v_source;

  if not found then
    raise exception 'Transaction not found or cannot be categorized.';
  end if;

  if v_source = 'plaid' then
    v_merchant_key := lower(regexp_replace(btrim(v_merchant_name), '[[:space:]]+', ' ', 'g'));

    if p_remember_merchant then
      insert into public.merchant_rules (
        user_id,
        merchant_name,
        merchant_key,
        category_id,
        subcategory_id,
        active,
        updated_at
      )
      values (
        (select auth.uid()),
        v_merchant_name,
        v_merchant_key,
        p_category_id,
        p_subcategory_id,
        true,
        now()
      )
      on conflict (user_id, merchant_key) do update
      set
        merchant_name = excluded.merchant_name,
        category_id = excluded.category_id,
        subcategory_id = excluded.subcategory_id,
        active = true,
        updated_at = now();
    else
      delete from public.merchant_rules
      where user_id = (select auth.uid())
        and merchant_key = v_merchant_key;
    end if;
  end if;
end;
$$;

revoke all on function public.categorize_transaction(uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.categorize_transaction(uuid, uuid, uuid, boolean) to authenticated, service_role;
