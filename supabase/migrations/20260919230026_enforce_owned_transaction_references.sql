-- A transaction may only reference a category or account belonging to the
-- same user, even when a caller somehow learns another row's UUID.
alter table public.categories
  add constraint categories_id_user_id_key unique (id, user_id);

alter table public.financial_accounts
  add constraint financial_accounts_id_user_id_key unique (id, user_id);

alter table public.transactions
  drop constraint transactions_category_id_fkey,
  drop constraint transactions_financial_account_id_fkey;

alter table public.transactions
  add constraint transactions_category_owner_fkey
    foreign key (category_id, user_id)
    references public.categories (id, user_id),
  add constraint transactions_account_owner_fkey
    foreign key (financial_account_id, user_id)
    references public.financial_accounts (id, user_id);
