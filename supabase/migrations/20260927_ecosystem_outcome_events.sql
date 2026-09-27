-- NexJud Ecosystem Outcome Events
-- Additive foundation for confirmed DocWallet/NexOffice/NextGen events.
create table if not exists public.legal_external_outcome_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  provider text not null check (provider in ('docwallet','nexoffice','nextgen')),
  event_type text not null,
  external_event_id text not null,
  status text not null default 'confirmed' check (status in ('received','confirmed','rejected')),
  document_ref text,
  payment_ref text,
  occurred_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(provider, external_event_id)
);
create index if not exists idx_external_outcomes_case on public.legal_external_outcome_events(user_id, case_id, created_at desc);
alter table public.legal_external_outcome_events enable row level security;
drop policy if exists "users read own external outcome events" on public.legal_external_outcome_events;
create policy "users read own external outcome events" on public.legal_external_outcome_events
for select using (auth.uid() = user_id);
-- No client INSERT/UPDATE/DELETE policy by design. Confirmed events are written only by trusted server-side ingestion.
