-- NexJud 1.0 billing hardening
-- Ensures 7-day trial expiry and prevents authenticated clients from mutating billing state.

alter table if exists public.subscriptions
  add column if not exists trial_start timestamptz,
  add column if not exists trial_end timestamptz;

update public.subscriptions
set
  trial_start = coalesce(trial_start, created_at, now()),
  trial_end = coalesce(trial_end, coalesce(trial_start, created_at, now()) + interval '7 days')
where status = 'trialing';

alter table if exists public.subscriptions
  alter column trial_start set default now(),
  alter column trial_end set default (now() + interval '7 days');

create unique index if not exists subscriptions_user_id_unique
  on public.subscriptions(user_id);

alter table if exists public.subscriptions enable row level security;

-- Billing state must be server-controlled. Users may read their own subscription,
-- but cannot create/upgrade/downgrade themselves from the browser.
revoke insert, update, delete on table public.subscriptions from authenticated;
grant select on table public.subscriptions to authenticated;

drop policy if exists "users read own subscription" on public.subscriptions;
create policy "users read own subscription"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);

-- payment_orders are written by trusted Edge Functions only.
alter table if exists public.payment_orders enable row level security;
revoke insert, update, delete on table public.payment_orders from authenticated;
grant select on table public.payment_orders to authenticated;

drop policy if exists "users read own payment orders" on public.payment_orders;
create policy "users read own payment orders"
on public.payment_orders
for select
to authenticated
using (auth.uid() = user_id);
