-- NexJud internal access
-- Server-controlled entitlement for founders/operators. Never grant from browser metadata.

create table if not exists public.internal_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_level text not null default 'owner' check (access_level in ('owner', 'admin', 'support')),
  active boolean not null default true,
  granted_at timestamptz not null default now(),
  granted_by uuid null references auth.users(id),
  notes text null
);

alter table public.internal_access enable row level security;

-- Authenticated users may only read their own entitlement. No browser INSERT/UPDATE/DELETE policies.
drop policy if exists "internal_access_read_own" on public.internal_access;
create policy "internal_access_read_own"
on public.internal_access
for select
to authenticated
using (auth.uid() = user_id);

create index if not exists internal_access_active_idx
  on public.internal_access (active)
  where active = true;
