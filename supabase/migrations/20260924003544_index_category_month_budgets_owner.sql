create index category_month_budgets_category_owner_idx
  on public.category_month_budgets (category_id, user_id);
