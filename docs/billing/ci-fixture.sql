-- Disposable CI-only Supabase-shaped fixture. NEVER execute in production.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as
  'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
create table public.subscriptions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique,
 plan_type text default 'free', plan text default 'trial',
 status text default 'trialing', active boolean default true,
 created_at timestamptz default now(), updated_at timestamptz default now(),
 trial_end timestamptz, payment_provider text, provider_subscription_id text
);
create table public.payment_orders(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null, plan text not null,
 amount_cents integer not null, provider text not null default 'woovi',
 status text not null default 'pending', correlation_id text not null unique,
 paid_at timestamptz, raw jsonb, created_at timestamptz default now()
);
alter table public.subscriptions enable row level security;
alter table public.payment_orders enable row level security;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
grant select on public.subscriptions,public.payment_orders to authenticated;
grant all on public.subscriptions,public.payment_orders to service_role;
create policy subscriptions_owner_read on public.subscriptions for select
 to authenticated using (auth.uid()=user_id);
create policy orders_owner_read on public.payment_orders for select
 to authenticated using (auth.uid()=user_id);
