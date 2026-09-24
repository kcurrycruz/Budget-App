alter table public.categories
  drop constraint if exists categories_spending_group_check;

alter table public.categories
  add constraint categories_spending_group_check
    check (spending_group in ('needs', 'wants', 'giving', 'savings', 'personal'));
