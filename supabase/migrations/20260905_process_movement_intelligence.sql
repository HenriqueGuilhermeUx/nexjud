-- NexJud Process Movement Intelligence
-- Persists normalized process movements, their legal impact analysis and deduplication state.

create table if not exists public.legal_process_movement_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  process_number text,
  movement_date timestamptz,
  movement_name text not null,
  movement_payload jsonb not null default '{}'::jsonb,
  fingerprint text not null,
  impact_level text not null default 'unknown' check (impact_level in ('low','medium','high','critical','unknown')),
  impact_summary text,
  strategic_effect text,
  recommended_action text,
  should_refresh_dossier boolean not null default false,
  notification_created boolean not null default false,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, case_id, fingerprint)
);

create index if not exists idx_process_movement_events_case
  on public.legal_process_movement_events(user_id, case_id, created_at desc);

create index if not exists idx_process_movement_events_impact
  on public.legal_process_movement_events(user_id, impact_level, created_at desc);

alter table public.legal_process_movement_events enable row level security;

drop policy if exists "users own process movement events" on public.legal_process_movement_events;
create policy "users own process movement events"
  on public.legal_process_movement_events
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_process_movement_event_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_process_movement_event on public.legal_process_movement_events;
create trigger trg_touch_process_movement_event
before update on public.legal_process_movement_events
for each row execute function public.touch_process_movement_event_updated_at();

comment on table public.legal_process_movement_events is
  'Movimentações processuais normalizadas e analisadas pelo NexJud para alimentar impacto, alertas e Dossiê Vivo.';
