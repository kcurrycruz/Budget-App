-- Private monthly bill tracking with per-month payment history.
create table public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category_id uuid,
  name text not null check (char_length(name) between 1 and 80),
  amount numeric(12, 2) not null check (amount > 0),
  due_day smallint not null check (due_day between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_bills_id_user_id_key unique (id, user_id),
  constraint recurring_bills_category_owner_fkey
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
);

create table public.recurring_bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  recurring_bill_id uuid not null,
  month date not null,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint recurring_bill_payments_bill_month_key unique (recurring_bill_id, month),
  constraint recurring_bill_payments_month_start_check
    check (month = date_trunc('month', month)::date),
  constraint recurring_bill_payments_bill_owner_fkey
    foreign key (recurring_bill_id, user_id)
    references public.recurring_bills (id, user_id)
    on delete cascade
);

create index recurring_bills_user_active_due_idx
  on public.recurring_bills (user_id, active, due_day);

create index recurring_bills_category_owner_idx
  on public.recurring_bills (category_id, user_id);

create index recurring_bill_payments_user_month_idx
  on public.recurring_bill_payments (user_id, month);

create index recurring_bill_payments_bill_owner_idx
  on public.recurring_bill_payments (recurring_bill_id, user_id);

alter table public.recurring_bills enable row level security;
alter table public.recurring_bill_payments enable row level security;

revoke all on public.recurring_bills, public.recurring_bill_payments from anon;
grant select, insert, update, delete on public.recurring_bills to authenticated;
grant select, insert, delete on public.recurring_bill_payments to authenticated;
grant select, insert, update, delete on public.recurring_bills, public.recurring_bill_payments to service_role;

create policy "Users can read their recurring bills"
  on public.recurring_bills for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their recurring bills"
  on public.recurring_bills for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their recurring bills"
  on public.recurring_bills for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their recurring bills"
  on public.recurring_bills for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their recurring bill payments"
  on public.recurring_bill_payments for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can mark their recurring bills paid"
  on public.recurring_bill_payments for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can undo recurring bill payments"
  on public.recurring_bill_payments for delete to authenticated
  using ((select auth.uid()) = user_id);
