-- Durable, server-only receipt log for verified Plaid webhooks.
alter table public.financial_accounts
  add column connection_status text not null default 'healthy'
    check (connection_status in ('healthy', 'attention'));

create table public.plaid_webhook_events (
  id uuid primary key default gen_random_uuid(),
  body_sha256 text not null unique check (body_sha256 ~ '^[0-9a-f]{64}$'),
  plaid_item_id text,
  webhook_type text not null check (char_length(webhook_type) between 1 and 80),
  webhook_code text not null check (char_length(webhook_code) between 1 and 120),
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'processed', 'ignored', 'failed')),
  attempts smallint not null default 0 check (attempts between 0 and 20),
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index plaid_webhook_events_pending_idx
  on public.plaid_webhook_events (status, received_at)
  where status in ('pending', 'failed');

alter table public.plaid_webhook_events enable row level security;

revoke all on public.plaid_webhook_events from public, anon, authenticated;
grant select, insert, update, delete on public.plaid_webhook_events to service_role;
