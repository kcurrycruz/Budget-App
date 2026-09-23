-- Cover the direct profile ownership foreign key and the common per-user load.
create index savings_goal_contributions_user_idx
  on public.savings_goal_contributions (user_id);
