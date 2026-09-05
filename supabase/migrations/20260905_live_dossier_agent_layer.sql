-- NexJud Live Dossier 2.0 + Legal Agent Layer
create table if not exists public.legal_case_dossiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  status text not null default 'ready',
  version integer not null default 1,
  executive_summary text,
  facts jsonb not null default '[]'::jsonb,
  legal_issues jsonb not null default '[]'::jsonb,
  parties jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  evidence_map jsonb not null default '[]'::jsonb,
  precedent_map jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  strategy jsonb not null default '{}'::jsonb,
  next_best_actions jsonb not null default '[]'::jsonb,
  confidence_score integer,
  last_analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, case_id)
);

create table if not exists public.legal_agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  dossier_id uuid references public.legal_case_dossiers(id) on delete cascade,
  agent_type text not null check (agent_type in ('case','evidence','precedent','strategy','orchestrator')),
  status text not null default 'completed',
  input_snapshot jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  confidence_score integer,
  model text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists public.legal_case_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  recommendation text,
  lawyer_decision text,
  action_taken text,
  outcome text,
  outcome_type text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_dossiers_user_case on public.legal_case_dossiers(user_id, case_id);
create index if not exists idx_agent_runs_case on public.legal_agent_runs(case_id, created_at desc);
create index if not exists idx_case_outcomes_case on public.legal_case_outcomes(case_id, created_at desc);

alter table public.legal_case_dossiers enable row level security;
alter table public.legal_agent_runs enable row level security;
alter table public.legal_case_outcomes enable row level security;

drop policy if exists "users own dossiers" on public.legal_case_dossiers;
create policy "users own dossiers" on public.legal_case_dossiers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users own agent runs" on public.legal_agent_runs;
create policy "users own agent runs" on public.legal_agent_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users own outcomes" on public.legal_case_outcomes;
create policy "users own outcomes" on public.legal_case_outcomes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_legal_case_dossier_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_legal_case_dossier on public.legal_case_dossiers;
create trigger trg_touch_legal_case_dossier before update on public.legal_case_dossiers for each row execute function public.touch_legal_case_dossier_updated_at();