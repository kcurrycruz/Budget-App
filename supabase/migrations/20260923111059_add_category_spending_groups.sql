alter table public.categories
  add column spending_group text not null default 'needs',
  add constraint categories_spending_group_check
    check (spending_group in ('needs', 'wants', 'savings'));

update public.categories
set spending_group = case
  when lower(name) in ('fun', 'entertainment', 'shopping', 'travel', 'other') then 'wants'
  when lower(name) in ('savings', 'investing', 'investments', 'retirement', 'emergency fund') then 'savings'
  else 'needs'
end;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.budget_months (user_id, month)
  values (new.id, date_trunc('month', current_date)::date);

  insert into public.categories (user_id, name, color, icon, spending_group, sort_order)
  values
    (new.id, 'Home', '#5C7CFA', 'home-variant-outline', 'needs', 10),
    (new.id, 'Food', '#E98A4C', 'silverware-fork-knife', 'needs', 20),
    (new.id, 'Transport', '#A16AE8', 'car-outline', 'needs', 30),
    (new.id, 'Fun', '#D65D7A', 'ticket-outline', 'wants', 40),
    (new.id, 'Other', '#5A9E91', 'dots-horizontal-circle-outline', 'wants', 50);

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated, service_role;
