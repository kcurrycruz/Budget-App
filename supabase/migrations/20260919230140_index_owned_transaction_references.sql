-- Cover the composite ownership foreign keys while preserving efficient
-- lookups by category or account through the leading index column.
drop index public.transactions_category_idx;
drop index public.transactions_financial_account_idx;

create index transactions_category_owner_idx
  on public.transactions (category_id, user_id);

create index transactions_account_owner_idx
  on public.transactions (financial_account_id, user_id);
