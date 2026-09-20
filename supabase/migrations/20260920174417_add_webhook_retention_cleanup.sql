-- Bound the server-only Plaid receipt log while preserving useful failure history.
create index plaid_webhook_events_completed_retention_idx
  on public.plaid_webhook_events (processed_at, id)
  where status in ('processed', 'ignored');

create index plaid_webhook_events_terminal_failure_retention_idx
  on public.plaid_webhook_events (updated_at, id)
  where status = 'failed' and attempts = 20;

create or replace function private.cleanup_plaid_webhook_events()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Limit each delete so maintenance holds row locks only briefly. Daily runs
  -- comfortably outpace the expected webhook volume for this app.
  with expired as (
    select event.id
    from public.plaid_webhook_events as event
    where event.status in ('processed', 'ignored')
      and event.processed_at < now() - interval '30 days'
    order by event.processed_at, event.id
    limit 5000
  )
  delete from public.plaid_webhook_events as event
  using expired
  where event.id = expired.id;

  with expired as (
    select event.id
    from public.plaid_webhook_events as event
    where event.status = 'failed'
      and event.attempts = 20
      and event.updated_at < now() - interval '90 days'
    order by event.updated_at, event.id
    limit 5000
  )
  delete from public.plaid_webhook_events as event
  using expired
  where event.id = expired.id;
end;
$$;

revoke all on function private.cleanup_plaid_webhook_events() from public, anon, authenticated, service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'plaid-webhook-receipt-cleanup';

select cron.schedule(
  'plaid-webhook-receipt-cleanup',
  '20 3 * * *',
  $job$select private.cleanup_plaid_webhook_events();$job$
);

-- pg_cron run history is not pruned automatically. Seven days is enough for
-- investigating this app's low-volume scheduled tasks without unbounded growth.
select cron.unschedule(jobid)
from cron.job
where jobname = 'budget-job-run-history-cleanup';

select cron.schedule(
  'budget-job-run-history-cleanup',
  '40 3 * * *',
  $job$delete from cron.job_run_details where end_time < now() - interval '7 days';$job$
);
