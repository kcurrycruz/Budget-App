create index planned_expense_contributions_expense_owner_idx
  on public.planned_expense_contributions (planned_expense_id, user_id);
