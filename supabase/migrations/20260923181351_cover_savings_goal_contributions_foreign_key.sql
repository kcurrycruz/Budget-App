-- Match the composite foreign-key column order while retaining the date sort.
drop index public.savings_goal_contributions_owner_goal_date_idx;

create index savings_goal_contributions_goal_owner_date_idx
  on public.savings_goal_contributions (savings_goal_id, user_id, contributed_on desc, created_at desc);
