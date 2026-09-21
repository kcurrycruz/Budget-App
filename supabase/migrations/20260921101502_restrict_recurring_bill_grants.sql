-- Supabase may apply broad default table privileges in the public schema.
-- Keep authenticated access limited to the operations used by the client.
revoke all on public.recurring_bills, public.recurring_bill_payments from authenticated;

grant select, insert, update, delete on public.recurring_bills to authenticated;
grant select, insert, delete on public.recurring_bill_payments to authenticated;
