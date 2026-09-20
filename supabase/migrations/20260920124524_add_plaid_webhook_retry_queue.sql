-- Recover verified Plaid webhook events when the initial background task fails.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

alter table public.plaid_webhook_events
  add column next_attempt_at timestamptz,
  add column claimed_at timestamptz;

update public.plaid_webhook_events
set next_attempt_at = coalesce(updated_at, received_at)
where status in ('pending', 'failed');

drop index if exists public.plaid_webhook_events_pending_idx;

create index plaid_webhook_events_retry_due_idx
  on public.plaid_webhook_events ((coalesce(next_attempt_at, received_at)), received_at)
  where status in ('pending', 'failed') and attempts < 20;

create index plaid_webhook_events_stale_claim_idx
  on public.plaid_webhook_events (claimed_at)
  where status = 'processing' and attempts < 20;

create or replace function public.claim_plaid_webhook_events(p_batch_size integer default 5)
returns table (
  id uuid,
  attempts smallint,
  payload jsonb
)
language sql
set search_path = ''
as $$
  with candidates as (
    select event.id
    from public.plaid_webhook_events as event
    where event.attempts < 20
      and (
        (
          event.status in ('pending', 'failed')
          and coalesce(event.next_attempt_at, event.received_at) <= now()
        )
        or (
          event.status = 'processing'
          and event.claimed_at < now() - interval '10 minutes'
        )
      )
    order by coalesce(event.next_attempt_at, event.claimed_at, event.received_at), event.received_at
    for update skip locked
    limit greatest(1, least(coalesce(p_batch_size, 5), 10))
  )
  update public.plaid_webhook_events as event
  set status = 'processing',
      attempts = event.attempts + 1,
      claimed_at = now(),
      next_attempt_at = null,
      last_error = null,
      updated_at = now()
  from candidates
  where event.id = candidates.id
  returning event.id, event.attempts, event.payload;
$$;

revoke all on function public.claim_plaid_webhook_events(integer) from public, anon, authenticated;
grant execute on function public.claim_plaid_webhook_events(integer) to service_role;

-- Only the retry Edge Function (which uses service_role internally) can ask whether
-- the secret supplied by Cron matches the value encrypted in Vault.
create or replace function public.authorize_plaid_webhook_retry(p_secret text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    char_length(p_secret) between 32 and 256
    and exists (
      select 1
      from vault.decrypted_secrets as secret
      where secret.name = 'plaid_webhook_retry_secret'
        and extensions.digest(secret.decrypted_secret, 'sha256') = extensions.digest(p_secret, 'sha256')
    ),
    false
  );
$$;

revoke all on function public.authorize_plaid_webhook_retry(text) from public, anon, authenticated;
grant execute on function public.authorize_plaid_webhook_retry(text) to service_role;

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'plaid_webhook_retry_secret'
  ) then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'plaid_webhook_retry_secret',
      'Authenticates the scheduled Plaid webhook recovery worker.'
    );
  end if;

  if not exists (
    select 1 from vault.secrets where name = 'plaid_webhook_retry_url'
  ) then
    perform vault.create_secret(
      'https://bqntwuywdzuojonctlch.supabase.co/functions/v1/plaid-webhook-retry',
      'plaid_webhook_retry_url',
      'Hosted Plaid webhook recovery worker URL.'
    );
  end if;
end;
$$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'plaid-webhook-retry';

select cron.schedule(
  'plaid-webhook-retry',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'plaid_webhook_retry_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-plaid-retry-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'plaid_webhook_retry_secret')
      ),
      body := '{"source":"cron"}'::jsonb,
      timeout_milliseconds := 60000
    );
  $job$
);
