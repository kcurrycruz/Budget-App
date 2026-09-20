-- These tables are intentionally server-only. Explicit deny policies add a
-- second boundary if client table privileges are ever granted by mistake.
create policy "Clients cannot access Plaid credentials"
  on public.plaid_items for all to authenticated
  using (false)
  with check (false);

create policy "Clients cannot access Plaid sync state"
  on public.plaid_sync_state for all to authenticated
  using (false)
  with check (false);
