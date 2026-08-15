create extension if not exists pgcrypto;

create table if not exists legal_precedent_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  case_id uuid null,
  title text not null,
  legal_issue text,
  case_facts text,
  applicability text check (applicability in ('strong','partial','weak','unknown')) default 'unknown',
  adherence_score int check (adherence_score between 0 and 100),
  risk_level text,
  strategy_summary text,
  sources jsonb default '[]'::jsonb,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists legal_precedent_analysis_items (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references legal_precedent_analyses(id) on delete cascade,
  precedent_id uuid null references legal_precedents(id) on delete set null,
  user_id uuid not null,
  precedent_title text,
  precedent_reference text,
  court text,
  qualified_type text,
  status text,
  thesis text,
  ratio text,
  modulation text,
  overcoming text,
  adherence_score int check (adherence_score between 0 and 100),
  supports_application text,
  supports_distinguishing text,
  created_at timestamptz default now()
);

create table if not exists legal_precedent_fact_matrix (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references legal_precedent_analyses(id) on delete cascade,
  user_id uuid not null,
  fact_name text not null,
  case_fact text,
  precedent_fact text,
  relation text check (relation in ('equivalent','similar','different','unknown')) default 'unknown',
  materiality text check (materiality in ('high','medium','low')) default 'medium',
  note text,
  created_at timestamptz default now()
);

create table if not exists legal_precedent_evidence_matrix (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references legal_precedent_analyses(id) on delete cascade,
  user_id uuid not null,
  requirement text not null,
  evidence_found text,
  evidence_strength text check (evidence_strength in ('strong','medium','weak','missing')) default 'missing',
  gap text,
  recommended_action text,
  created_at timestamptz default now()
);

create table if not exists legal_precedent_monitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  precedent_id uuid null references legal_precedents(id) on delete cascade,
  external_reference text,
  court text,
  theme text,
  watch_status text default 'active',
  last_known_status text,
  last_checked_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists legal_precedent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  monitor_id uuid null references legal_precedent_monitors(id) on delete cascade,
  event_type text,
  title text not null,
  description text,
  source_url text,
  event_date timestamptz,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists legal_case_precedent_impacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  case_id uuid not null,
  precedent_id uuid null references legal_precedents(id) on delete set null,
  monitor_id uuid null references legal_precedent_monitors(id) on delete set null,
  impact_direction text check (impact_direction in ('favorable','adverse','review','unknown')) default 'unknown',
  impact_score int check (impact_score between 0 and 100),
  reason text,
  recommended_action text,
  status text default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table legal_precedent_analyses enable row level security;
alter table legal_precedent_analysis_items enable row level security;
alter table legal_precedent_fact_matrix enable row level security;
alter table legal_precedent_evidence_matrix enable row level security;
alter table legal_precedent_monitors enable row level security;
alter table legal_precedent_events enable row level security;
alter table legal_case_precedent_impacts enable row level security;

-- PostgreSQL/Supabase does not support CREATE POLICY IF NOT EXISTS.
-- Drop first so this migration remains safe to rerun after a partial execution.
drop policy if exists "precedent analyses own rows" on legal_precedent_analyses;
create policy "precedent analyses own rows"
on legal_precedent_analyses
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "precedent analysis items own rows" on legal_precedent_analysis_items;
create policy "precedent analysis items own rows"
on legal_precedent_analysis_items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "precedent fact matrix own rows" on legal_precedent_fact_matrix;
create policy "precedent fact matrix own rows"
on legal_precedent_fact_matrix
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "precedent evidence matrix own rows" on legal_precedent_evidence_matrix;
create policy "precedent evidence matrix own rows"
on legal_precedent_evidence_matrix
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "precedent monitors own rows" on legal_precedent_monitors;
create policy "precedent monitors own rows"
on legal_precedent_monitors
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "precedent events own rows" on legal_precedent_events;
create policy "precedent events own rows"
on legal_precedent_events
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "case precedent impacts own rows" on legal_case_precedent_impacts;
create policy "case precedent impacts own rows"
on legal_case_precedent_impacts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_precedent_analyses_user on legal_precedent_analyses(user_id, created_at desc);
create index if not exists idx_precedent_analysis_items_analysis on legal_precedent_analysis_items(analysis_id);
create index if not exists idx_precedent_fact_matrix_analysis on legal_precedent_fact_matrix(analysis_id);
create index if not exists idx_precedent_evidence_matrix_analysis on legal_precedent_evidence_matrix(analysis_id);
create index if not exists idx_precedent_monitors_user on legal_precedent_monitors(user_id, watch_status);
create index if not exists idx_precedent_events_monitor on legal_precedent_events(monitor_id, event_date desc);
create index if not exists idx_case_precedent_impacts_case on legal_case_precedent_impacts(case_id, status);
