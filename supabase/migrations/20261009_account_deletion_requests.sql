-- NexJud self-service account deletion request flow
-- Supports App Store account deletion requirement without requiring support e-mail.

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  status text not null default 'requested'
    check (status in ('requested','processing','completed','cancelled')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists account_deletion_requests_one_open_per_user
on public.account_deletion_requests (user_id)
where status in ('requested','processing');

alter table public.account_deletion_requests enable row level security;

drop policy if exists "account_deletion_requests_select_own" on public.account_deletion_requests;
create policy "account_deletion_requests_select_own"
on public.account_deletion_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "account_deletion_requests_insert_own" on public.account_deletion_requests;
create policy "account_deletion_requests_insert_own"
on public.account_deletion_requests
for insert
to authenticated
with check (
  auth.uid() = user_id
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
  and status = 'requested'
);

grant select, insert on public.account_deletion_requests to authenticated;
revoke all on public.account_deletion_requests from anon;
