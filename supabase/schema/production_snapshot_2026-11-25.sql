-- =============================================================================
-- NexJud — snapshot do schema PUBLIC de produção
-- Projeto Supabase: zoruralbsxrbsaicihzu
-- Extraído em 2026-11-25 direto do catálogo do Postgres (somente leitura).
--
-- Este arquivo é a referência do que existe em produção. NÃO é uma migration:
-- não está em supabase/migrations/ para que a CLI nunca tente aplicá-lo no banco
-- de produção. Serve para:
--   1) revisar tabelas, RLS e policies no código;
--   2) subir um ambiente novo (branch/staging) igual à produção.
-- Para regenerar, ver supabase/schema/README.md.
--
-- Conteúdo: 45 tabelas (todas com RLS ligado), 86 policies, 1 view,
-- 8 funções SQL, 4 triggers, 52 índices, 1 bucket de storage.
-- =============================================================================

-- Extensões (schema onde estão instaladas em produção)
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists http with schema extensions;
create extension if not exists vector with schema public;

-- -----------------------------------------------------------------------------
-- Tabelas (chaves estrangeiras ficam na seção seguinte)
-- -----------------------------------------------------------------------------

create table if not exists public.account_deletion_requests (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  email text not null,
  status text default 'requested'::text not null,
  requested_at timestamp with time zone default now() not null,
  processed_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb not null,
  constraint account_deletion_requests_pkey PRIMARY KEY (id),
  constraint account_deletion_requests_status_check CHECK ((status = ANY (ARRAY['requested'::text, 'processing'::text, 'completed'::text, 'cancelled'::text])))
);

create table if not exists public.ai_copilot_sessions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  prompt text not null,
  result jsonb default '{}'::jsonb,
  executive_summary text,
  success_probability integer default 0,
  risk_level text,
  decision text,
  next_move text,
  created_at timestamp with time zone default now(),
  constraint ai_copilot_sessions_pkey PRIMARY KEY (id)
);

create table if not exists public.analysis_history (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  type text not null,
  input_data jsonb not null,
  result jsonb not null,
  created_at timestamp with time zone default now(),
  constraint analysis_history_pkey PRIMARY KEY (id),
  constraint analysis_history_type_check CHECK ((type = ANY (ARRAY['predictive'::text, 'jurisprudence'::text])))
);

create table if not exists public.board_reports (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text,
  report_type text default 'executive'::text,
  summary text,
  decision text,
  risk_level text,
  financial_impact text,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  constraint board_reports_pkey PRIMARY KEY (id)
);

create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  session_id uuid not null,
  role text not null,
  content text not null,
  context_used jsonb default '{}'::jsonb,
  tokens integer default 0,
  created_at timestamp with time zone default now(),
  constraint chat_messages_pkey PRIMARY KEY (id),
  constraint chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);

create table if not exists public.chat_sessions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  case_id uuid,
  title text default 'Novo chat jurídico'::text not null,
  summary text,
  pinned boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint chat_sessions_pkey PRIMARY KEY (id)
);

create table if not exists public.client_risk_cache (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  client_name text not null,
  risk_score integer default 0,
  risk_level text,
  findings jsonb default '[]'::jsonb,
  data jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default now(),
  constraint client_risk_cache_pkey PRIMARY KEY (id)
);

create table if not exists public.cnj_processes (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  case_id uuid,
  process_number text not null,
  court text,
  class_name text,
  subject text,
  parties jsonb default '[]'::jsonb,
  movements jsonb default '[]'::jsonb,
  last_movement text,
  last_movement_at timestamp with time zone,
  raw_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint cnj_processes_pkey PRIMARY KEY (id)
);

create table if not exists public.drafts (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text,
  draft_type text,
  case_text text,
  focus text,
  result jsonb,
  created_at timestamp with time zone default now(),
  case_id uuid,
  constraint drafts_pkey PRIMARY KEY (id)
);

create table if not exists public.favorites (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  type text not null,
  reference_id text,
  title text,
  created_at timestamp with time zone default now(),
  constraint favorites_pkey PRIMARY KEY (id),
  constraint favorites_type_check CHECK ((type = ANY (ARRAY['predictive'::text, 'jurisprudence'::text])))
);

create table if not exists public.internal_access (
  user_id uuid not null,
  access_level text default 'owner'::text not null,
  active boolean default true not null,
  granted_at timestamp with time zone default now() not null,
  granted_by uuid,
  notes text,
  constraint internal_access_pkey PRIMARY KEY (user_id),
  constraint internal_access_access_level_check CHECK ((access_level = ANY (ARRAY['owner'::text, 'admin'::text, 'support'::text])))
);

create table if not exists public.judge_sessions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text,
  case_text text,
  hearing_type text,
  difficulty text,
  history jsonb,
  last_score integer,
  created_at timestamp with time zone default now(),
  constraint judge_sessions_pkey PRIMARY KEY (id)
);

create table if not exists public.knowledge_chunks (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  document_id uuid not null,
  case_id uuid,
  chunk_number integer default 0 not null,
  content text not null,
  tokens integer default 0,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  constraint knowledge_chunks_pkey PRIMARY KEY (id)
);

create table if not exists public.knowledge_documents (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  case_id uuid,
  title text not null,
  document_type text default 'general'::text,
  client_name text,
  process_number text,
  file_name text,
  file_url text,
  content text,
  summary text,
  tags text[] default '{}'::text[],
  status text default 'processed'::text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint knowledge_documents_pkey PRIMARY KEY (id)
);

create table if not exists public.legal_agent_runs (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  case_id uuid not null,
  dossier_id uuid,
  agent_type text not null,
  status text default 'completed'::text not null,
  input_snapshot jsonb default '{}'::jsonb not null,
  output jsonb default '{}'::jsonb not null,
  confidence_score integer,
  model text,
  duration_ms integer,
  created_at timestamp with time zone default now() not null,
  constraint legal_agent_runs_pkey PRIMARY KEY (id),
  constraint legal_agent_runs_agent_type_check CHECK ((agent_type = ANY (ARRAY['case'::text, 'evidence'::text, 'precedent'::text, 'strategy'::text, 'orchestrator'::text])))
);

create table if not exists public.legal_case_dossiers (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  case_id uuid not null,
  status text default 'ready'::text not null,
  version integer default 1 not null,
  executive_summary text,
  facts jsonb default '[]'::jsonb not null,
  legal_issues jsonb default '[]'::jsonb not null,
  parties jsonb default '[]'::jsonb not null,
  timeline jsonb default '[]'::jsonb not null,
  evidence_map jsonb default '[]'::jsonb not null,
  precedent_map jsonb default '[]'::jsonb not null,
  risks jsonb default '[]'::jsonb not null,
  strategy jsonb default '{}'::jsonb not null,
  next_best_actions jsonb default '[]'::jsonb not null,
  confidence_score integer,
  last_analyzed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint legal_case_dossiers_user_id_case_id_key UNIQUE (user_id, case_id),
  constraint legal_case_dossiers_pkey PRIMARY KEY (id)
);

create table if not exists public.legal_case_outcomes (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  case_id uuid not null,
  recommendation text,
  lawyer_decision text,
  action_taken text,
  outcome text,
  outcome_type text,
  metadata jsonb default '{}'::jsonb not null,
  occurred_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  result_score integer,
  result_status text,
  learned_lesson text,
  source text default 'manual'::text,
  constraint legal_case_outcomes_pkey PRIMARY KEY (id)
);

create table if not exists public.legal_case_precedent_impacts (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  case_id uuid not null,
  precedent_id uuid,
  monitor_id uuid,
  impact_direction text default 'unknown'::text,
  impact_score integer,
  reason text,
  recommended_action text,
  status text default 'open'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint legal_case_precedent_impacts_pkey PRIMARY KEY (id),
  constraint legal_case_precedent_impacts_impact_direction_check CHECK ((impact_direction = ANY (ARRAY['favorable'::text, 'adverse'::text, 'review'::text, 'unknown'::text]))),
  constraint legal_case_precedent_impacts_impact_score_check CHECK (((impact_score >= 0) AND (impact_score <= 100)))
);

create table if not exists public.legal_cases (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  client_name text,
  process_number text,
  opponent_name text,
  court text,
  status text default 'active'::text,
  summary text,
  risk_level text,
  success_probability integer default 0,
  tags text[] default '{}'::text[],
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint legal_cases_pkey PRIMARY KEY (id)
);

create table if not exists public.legal_intelligence_reports (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text,
  case_text text,
  opponent_name text,
  client_name text,
  tribunal text,
  result jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  constraint legal_intelligence_reports_pkey PRIMARY KEY (id)
);

create table if not exists public.legal_jurisprudence (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  title text not null,
  court text,
  area text,
  theme text,
  summary text,
  content text not null,
  source_url text,
  process_number text,
  decision_date date,
  tags text[] default '{}'::text[],
  created_at timestamp with time zone default now(),
  constraint legal_jurisprudence_pkey PRIMARY KEY (id)
);

create table if not exists public.legal_memory (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  case_id uuid,
  memory_type text default 'general'::text,
  title text not null,
  content text not null,
  importance integer default 3,
  source text default 'manual'::text,
  tags text[] default '{}'::text[],
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint legal_memory_pkey PRIMARY KEY (id)
);

create table if not exists public.legal_morning_briefs (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  brief_date date default CURRENT_DATE not null,
  executive_summary text,
  payload jsonb default '{}'::jsonb not null,
  status text default 'ready'::text not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  constraint legal_morning_briefs_user_id_brief_date_key UNIQUE (user_id, brief_date),
  constraint legal_morning_briefs_pkey PRIMARY KEY (id)
);

create table if not exists public.legal_precedent_analyses (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  case_id uuid,
  title text not null,
  legal_issue text,
  case_facts text,
  applicability text default 'unknown'::text,
  adherence_score integer,
  risk_level text,
  strategy_summary text,
  sources jsonb default '[]'::jsonb,
  status text default 'draft'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint legal_precedent_analyses_pkey PRIMARY KEY (id),
  constraint legal_precedent_analyses_adherence_score_check CHECK (((adherence_score >= 0) AND (adherence_score <= 100))),
  constraint legal_precedent_analyses_applicability_check CHECK ((applicability = ANY (ARRAY['strong'::text, 'partial'::text, 'weak'::text, 'unknown'::text])))
);

create table if not exists public.legal_precedent_analysis_items (
  id uuid default gen_random_uuid() not null,
  analysis_id uuid not null,
  precedent_id uuid,
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
  adherence_score integer,
  supports_application text,
  supports_distinguishing text,
  created_at timestamp with time zone default now(),
  constraint legal_precedent_analysis_items_pkey PRIMARY KEY (id),
  constraint legal_precedent_analysis_items_adherence_score_check CHECK (((adherence_score >= 0) AND (adherence_score <= 100)))
);

create table if not exists public.legal_precedent_events (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  monitor_id uuid,
  event_type text,
  title text not null,
  description text,
  source_url text,
  event_date timestamp with time zone,
  payload jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  constraint legal_precedent_events_pkey PRIMARY KEY (id)
);

create table if not exists public.legal_precedent_evidence_matrix (
  id uuid default gen_random_uuid() not null,
  analysis_id uuid not null,
  user_id uuid not null,
  requirement text not null,
  evidence_found text,
  evidence_strength text default 'missing'::text,
  gap text,
  recommended_action text,
  created_at timestamp with time zone default now(),
  constraint legal_precedent_evidence_matrix_pkey PRIMARY KEY (id),
  constraint legal_precedent_evidence_matrix_evidence_strength_check CHECK ((evidence_strength = ANY (ARRAY['strong'::text, 'medium'::text, 'weak'::text, 'missing'::text])))
);

create table if not exists public.legal_precedent_fact_matrix (
  id uuid default gen_random_uuid() not null,
  analysis_id uuid not null,
  user_id uuid not null,
  fact_name text not null,
  case_fact text,
  precedent_fact text,
  relation text default 'unknown'::text,
  materiality text default 'medium'::text,
  note text,
  created_at timestamp with time zone default now(),
  constraint legal_precedent_fact_matrix_pkey PRIMARY KEY (id),
  constraint legal_precedent_fact_matrix_materiality_check CHECK ((materiality = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))),
  constraint legal_precedent_fact_matrix_relation_check CHECK ((relation = ANY (ARRAY['equivalent'::text, 'similar'::text, 'different'::text, 'unknown'::text])))
);

create table if not exists public.legal_precedent_monitors (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  precedent_id uuid,
  external_reference text,
  court text,
  theme text,
  watch_status text default 'active'::text,
  last_known_status text,
  last_checked_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  constraint legal_precedent_monitors_pkey PRIMARY KEY (id)
);

create table if not exists public.legal_precedents (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  title text not null,
  tribunal text,
  tema text,
  numero text,
  resumo text,
  fundamento text,
  impacto text,
  tags text[] default '{}'::text[],
  created_at timestamp with time zone default now(),
  constraint legal_precedents_pkey PRIMARY KEY (id)
);

create table if not exists public.legal_process_movement_events (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  case_id uuid not null,
  process_number text,
  movement_date timestamp with time zone,
  movement_name text not null,
  movement_payload jsonb default '{}'::jsonb not null,
  fingerprint text not null,
  impact_level text default 'unknown'::text not null,
  impact_summary text,
  strategic_effect text,
  recommended_action text,
  should_refresh_dossier boolean default false not null,
  notification_created boolean default false not null,
  analyzed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint legal_process_movement_events_user_id_case_id_fingerprint_key UNIQUE (user_id, case_id, fingerprint),
  constraint legal_process_movement_events_pkey PRIMARY KEY (id),
  constraint legal_process_movement_events_impact_level_check CHECK ((impact_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text, 'unknown'::text])))
);

create table if not exists public.legal_strategic_memories (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  case_id uuid,
  area text,
  issue text,
  situation text,
  strategy text,
  action_taken text,
  result_status text,
  result_summary text,
  lesson text not null,
  confidence_score integer,
  reusable boolean default true not null,
  source_outcome_id uuid,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint legal_strategic_memories_pkey PRIMARY KEY (id),
  constraint legal_strategic_memories_confidence_score_check CHECK (((confidence_score IS NULL) OR ((confidence_score >= 0) AND (confidence_score <= 100))))
);

create table if not exists public.litigation_strategies (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text,
  case_text text,
  strategy jsonb,
  created_at timestamp with time zone default now(),
  constraint litigation_strategies_pkey PRIMARY KEY (id)
);

create table if not exists public.one_click_actions_log (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  action_type text,
  title text,
  payload jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  constraint one_click_actions_log_pkey PRIMARY KEY (id)
);

create table if not exists public.opponent_database (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  opponent_name text not null,
  profile text,
  total_processes integer default 0,
  settlement_signal numeric default 0,
  appeal_signal numeric default 0,
  risk_level text,
  notes text,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  constraint opponent_database_pkey PRIMARY KEY (id)
);

create table if not exists public.opponent_intelligence_cache (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  opponent_name text not null,
  total_processes integer default 0,
  profile text,
  settlement_signal numeric default 0,
  appeal_signal numeric default 0,
  data jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default now(),
  constraint opponent_intelligence_cache_pkey PRIMARY KEY (id)
);

create table if not exists public.partner_council_sessions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text,
  case_text text,
  conservative_partner jsonb default '{}'::jsonb,
  aggressive_partner jsonb default '{}'::jsonb,
  strategic_partner jsonb default '{}'::jsonb,
  final_vote text,
  created_at timestamp with time zone default now(),
  constraint partner_council_sessions_pkey PRIMARY KEY (id)
);

create table if not exists public.payment_orders (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  plan text not null,
  amount_cents integer not null,
  provider text default 'woovi'::text not null,
  status text default 'pending'::text not null,
  correlation_id text not null,
  br_code text,
  qr_code_image text,
  payment_link text,
  raw jsonb,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  constraint payment_orders_pkey PRIMARY KEY (id)
);

create table if not exists public.profiles (
  id uuid not null,
  name text,
  email text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  free_uses_count integer default 0,
  is_premium boolean default false,
  subscription_plan text default 'trial'::text,
  subscription_status text default 'trial'::text,
  trial_started_at timestamp with time zone,
  trial_ends_at timestamp with time zone,
  premium_until timestamp with time zone,
  onboarding_completed boolean default false,
  user_profile_type text,
  main_legal_area text,
  main_goal text,
  onboarding_completed_at timestamp with time zone,
  constraint profiles_pkey PRIMARY KEY (id)
);

create table if not exists public.strategic_analyses (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text,
  case_text text,
  success_probability integer,
  risk_level text,
  financial_potential text,
  case_dna jsonb,
  deal_breakers jsonb,
  red_team jsonb,
  strategy_engine jsonb,
  partner_decision text,
  created_at timestamp with time zone default now(),
  jurisprudence_prediction jsonb default '{}'::jsonb,
  financial_exposure jsonb default '{}'::jsonb,
  partner_council jsonb default '[]'::jsonb,
  war_room jsonb default '{}'::jsonb,
  case_timeline jsonb default '[]'::jsonb,
  tribunal_dna jsonb default '{}'::jsonb,
  auditor_findings jsonb default '{}'::jsonb,
  due_diligence jsonb default '{}'::jsonb,
  legal_command_center jsonb default '{}'::jsonb,
  one_click_actions jsonb default '[]'::jsonb,
  deal_economics jsonb default '{}'::jsonb,
  client_risk jsonb default '{}'::jsonb,
  opponent_intelligence jsonb default '{}'::jsonb,
  board_report jsonb default '{}'::jsonb,
  real_jurisprudence jsonb default '{}'::jsonb,
  constraint strategic_analyses_pkey PRIMARY KEY (id)
);

create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  plan_type text default 'free'::text,
  status text default 'active'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  woovi_subscription_id text,
  plan text default 'trial'::text,
  active boolean default true,
  trial_start timestamp with time zone default now(),
  trial_end timestamp with time zone default (now() + '7 days'::interval),
  payment_provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  constraint subscriptions_woovi_subscription_id_key UNIQUE (woovi_subscription_id),
  constraint subscriptions_pkey PRIMARY KEY (id),
  constraint subscriptions_plan_type_check CHECK ((plan_type = ANY (ARRAY['free'::text, 'pro'::text, 'enterprise'::text]))),
  constraint subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'cancelled'::text, 'pending'::text])))
);

create table if not exists public.tribunal_dna_cache (
  id uuid default gen_random_uuid() not null,
  tribunal text not null,
  total_processes integer default 0,
  avg_movements integer default 0,
  avg_duration_days integer default 0,
  success_rate numeric default 0,
  data jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default now(),
  user_id uuid,
  profile text,
  constraint tribunal_dna_cache_pkey PRIMARY KEY (id)
);

create table if not exists public.tribunal_heatmap (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  tribunal text not null,
  total_processes integer default 0,
  avg_movements integer default 0,
  risk_level text,
  efficiency_score integer default 0,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  constraint tribunal_heatmap_pkey PRIMARY KEY (id)
);

create table if not exists public.war_room_sessions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text,
  case_text text,
  risks jsonb default '[]'::jsonb,
  opportunities jsonb default '[]'::jsonb,
  missing_evidence jsonb default '[]'::jsonb,
  opponent_arguments jsonb default '[]'::jsonb,
  next_moves jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  constraint war_room_sessions_pkey PRIMARY KEY (id)
);

create table if not exists public.woovi_webhooks_raw (
  event text,
  evento text,
  data_criacao text,
  subscription jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- Chaves estrangeiras
-- -----------------------------------------------------------------------------

alter table public.analysis_history add constraint analysis_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.chat_messages add constraint chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;
alter table public.chat_messages add constraint chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.chat_sessions add constraint chat_sessions_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE SET NULL;
alter table public.chat_sessions add constraint chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.cnj_processes add constraint cnj_processes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.drafts add constraint drafts_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE SET NULL;
alter table public.favorites add constraint favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.internal_access add constraint internal_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id);
alter table public.internal_access add constraint internal_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.knowledge_chunks add constraint knowledge_chunks_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE SET NULL;
alter table public.knowledge_chunks add constraint knowledge_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.knowledge_documents(id) ON DELETE CASCADE;
alter table public.knowledge_chunks add constraint knowledge_chunks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.knowledge_documents add constraint knowledge_documents_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE SET NULL;
alter table public.knowledge_documents add constraint knowledge_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.legal_agent_runs add constraint legal_agent_runs_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;
alter table public.legal_agent_runs add constraint legal_agent_runs_dossier_id_fkey FOREIGN KEY (dossier_id) REFERENCES public.legal_case_dossiers(id) ON DELETE CASCADE;
alter table public.legal_agent_runs add constraint legal_agent_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.legal_case_dossiers add constraint legal_case_dossiers_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;
alter table public.legal_case_dossiers add constraint legal_case_dossiers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.legal_case_outcomes add constraint legal_case_outcomes_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;
alter table public.legal_case_outcomes add constraint legal_case_outcomes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.legal_case_precedent_impacts add constraint legal_case_precedent_impacts_monitor_id_fkey FOREIGN KEY (monitor_id) REFERENCES public.legal_precedent_monitors(id) ON DELETE SET NULL;
alter table public.legal_case_precedent_impacts add constraint legal_case_precedent_impacts_precedent_id_fkey FOREIGN KEY (precedent_id) REFERENCES public.legal_precedents(id) ON DELETE SET NULL;
alter table public.legal_cases add constraint legal_cases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.legal_jurisprudence add constraint legal_jurisprudence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.legal_memory add constraint legal_memory_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE SET NULL;
alter table public.legal_memory add constraint legal_memory_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.legal_morning_briefs add constraint legal_morning_briefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.legal_precedent_analysis_items add constraint legal_precedent_analysis_items_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.legal_precedent_analyses(id) ON DELETE CASCADE;
alter table public.legal_precedent_analysis_items add constraint legal_precedent_analysis_items_precedent_id_fkey FOREIGN KEY (precedent_id) REFERENCES public.legal_precedents(id) ON DELETE SET NULL;
alter table public.legal_precedent_events add constraint legal_precedent_events_monitor_id_fkey FOREIGN KEY (monitor_id) REFERENCES public.legal_precedent_monitors(id) ON DELETE CASCADE;
alter table public.legal_precedent_evidence_matrix add constraint legal_precedent_evidence_matrix_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.legal_precedent_analyses(id) ON DELETE CASCADE;
alter table public.legal_precedent_fact_matrix add constraint legal_precedent_fact_matrix_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.legal_precedent_analyses(id) ON DELETE CASCADE;
alter table public.legal_precedent_monitors add constraint legal_precedent_monitors_precedent_id_fkey FOREIGN KEY (precedent_id) REFERENCES public.legal_precedents(id) ON DELETE CASCADE;
alter table public.legal_precedents add constraint legal_precedents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.legal_process_movement_events add constraint legal_process_movement_events_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;
alter table public.legal_process_movement_events add constraint legal_process_movement_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.legal_strategic_memories add constraint legal_strategic_memories_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.legal_cases(id) ON DELETE CASCADE;
alter table public.legal_strategic_memories add constraint legal_strategic_memories_source_outcome_id_fkey FOREIGN KEY (source_outcome_id) REFERENCES public.legal_case_outcomes(id) ON DELETE SET NULL;
alter table public.legal_strategic_memories add constraint legal_strategic_memories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.subscriptions add constraint subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- Índices (além dos criados por PK/UNIQUE)
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX account_deletion_requests_one_open_per_user ON public.account_deletion_requests USING btree (user_id) WHERE (status = ANY (ARRAY['requested'::text, 'processing'::text]));
CREATE INDEX idx_ai_copilot_sessions_user ON public.ai_copilot_sessions USING btree (user_id);
CREATE INDEX analysis_history_user_id_created_at_idx ON public.analysis_history USING btree (user_id, created_at DESC);
CREATE INDEX idx_analysis_history_created_at ON public.analysis_history USING btree (created_at DESC);
CREATE INDEX idx_analysis_history_type ON public.analysis_history USING btree (type);
CREATE INDEX idx_analysis_history_user_id ON public.analysis_history USING btree (user_id);
CREATE INDEX idx_board_reports_user ON public.board_reports USING btree (user_id);
CREATE INDEX idx_chat_messages_session ON public.chat_messages USING btree (session_id);
CREATE INDEX idx_chat_sessions_user ON public.chat_sessions USING btree (user_id);
CREATE INDEX idx_client_risk_user ON public.client_risk_cache USING btree (user_id);
CREATE UNIQUE INDEX cnj_processes_user_process_number_unique ON public.cnj_processes USING btree (user_id, process_number);
CREATE INDEX idx_cnj_processes_process_number ON public.cnj_processes USING btree (process_number);
CREATE INDEX idx_cnj_processes_user_id ON public.cnj_processes USING btree (user_id);
CREATE INDEX idx_drafts_case_id ON public.drafts USING btree (case_id, created_at DESC);
CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id);
CREATE INDEX idx_knowledge_chunks_document ON public.knowledge_chunks USING btree (document_id);
CREATE INDEX idx_knowledge_chunks_user ON public.knowledge_chunks USING btree (user_id);
CREATE INDEX idx_knowledge_documents_case ON public.knowledge_documents USING btree (case_id);
CREATE INDEX idx_knowledge_documents_user ON public.knowledge_documents USING btree (user_id);
CREATE INDEX idx_agent_runs_case ON public.legal_agent_runs USING btree (case_id, created_at DESC);
CREATE INDEX idx_dossiers_user_case ON public.legal_case_dossiers USING btree (user_id, case_id);
CREATE INDEX idx_case_outcomes_case ON public.legal_case_outcomes USING btree (case_id, created_at DESC);
CREATE INDEX idx_case_outcomes_type ON public.legal_case_outcomes USING btree (case_id, outcome_type, created_at DESC);
CREATE INDEX idx_case_precedent_impacts_case ON public.legal_case_precedent_impacts USING btree (case_id, status);
CREATE INDEX idx_legal_cases_user ON public.legal_cases USING btree (user_id);
CREATE INDEX idx_legal_intelligence_reports_user ON public.legal_intelligence_reports USING btree (user_id);
CREATE INDEX idx_legal_jurisprudence_area ON public.legal_jurisprudence USING btree (area);
CREATE INDEX idx_legal_jurisprudence_court ON public.legal_jurisprudence USING btree (court);
CREATE INDEX idx_legal_jurisprudence_user_id ON public.legal_jurisprudence USING btree (user_id);
CREATE INDEX idx_legal_memory_user ON public.legal_memory USING btree (user_id);
CREATE INDEX idx_legal_morning_briefs_user_date ON public.legal_morning_briefs USING btree (user_id, brief_date DESC);
CREATE INDEX idx_precedent_analyses_user ON public.legal_precedent_analyses USING btree (user_id, created_at DESC);
CREATE INDEX idx_precedent_analysis_items_analysis ON public.legal_precedent_analysis_items USING btree (analysis_id);
CREATE INDEX idx_precedent_events_monitor ON public.legal_precedent_events USING btree (monitor_id, event_date DESC);
CREATE INDEX idx_precedent_evidence_matrix_analysis ON public.legal_precedent_evidence_matrix USING btree (analysis_id);
CREATE INDEX idx_precedent_fact_matrix_analysis ON public.legal_precedent_fact_matrix USING btree (analysis_id);
CREATE INDEX idx_precedent_monitors_user ON public.legal_precedent_monitors USING btree (user_id, watch_status);
CREATE INDEX idx_process_movement_events_case ON public.legal_process_movement_events USING btree (user_id, case_id, created_at DESC);
CREATE INDEX idx_process_movement_events_impact ON public.legal_process_movement_events USING btree (user_id, impact_level, created_at DESC);
CREATE INDEX idx_strategic_memories_area ON public.legal_strategic_memories USING btree (user_id, area, issue);
CREATE INDEX idx_strategic_memories_user ON public.legal_strategic_memories USING btree (user_id, created_at DESC);
CREATE INDEX idx_one_click_user ON public.one_click_actions_log USING btree (user_id);
CREATE INDEX idx_opponent_database_user ON public.opponent_database USING btree (user_id);
CREATE INDEX idx_opponent_user ON public.opponent_intelligence_cache USING btree (user_id);
CREATE INDEX idx_partner_council_user ON public.partner_council_sessions USING btree (user_id);
-- subscriptions tem 4 índices em user_id em produção (2 duplicados). Mantidos aqui
-- como estão; a limpeza fica para uma migration própria.
CREATE INDEX idx_subscriptions_user ON public.subscriptions USING btree (user_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);
CREATE UNIQUE INDEX idx_subscriptions_user_unique ON public.subscriptions USING btree (user_id);
CREATE UNIQUE INDEX subscriptions_user_id_unique ON public.subscriptions USING btree (user_id);
CREATE INDEX idx_tribunal_dna_user ON public.tribunal_dna_cache USING btree (user_id);
CREATE INDEX idx_tribunal_heatmap_user ON public.tribunal_heatmap USING btree (user_id);
CREATE INDEX idx_war_room_user ON public.war_room_sessions USING btree (user_id);

-- -----------------------------------------------------------------------------
-- View
-- -----------------------------------------------------------------------------

create or replace view public.legal_case_outcome_metrics as
 SELECT user_id,
    case_id,
    count(*) AS events_count,
    count(*) FILTER (WHERE ((lawyer_decision IS NOT NULL) AND (lawyer_decision <> ''::text))) AS decisions_count,
    count(*) FILTER (WHERE ((action_taken IS NOT NULL) AND (action_taken <> ''::text))) AS actions_count,
    count(*) FILTER (WHERE ((outcome IS NOT NULL) AND (outcome <> ''::text))) AS outcomes_count,
    avg(result_score) FILTER (WHERE (result_score IS NOT NULL)) AS avg_result_score,
    max(created_at) AS last_event_at
   FROM public.legal_case_outcomes
  GROUP BY user_id, case_id;

-- -----------------------------------------------------------------------------
-- Funções SQL (exceto as que pertencem a extensões)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_woovi_subscription(plan_id text, customer_name text, customer_email text, customer_tax_id text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  raise exception 'legacy_billing_rpc_disabled_use_create_pix_checkout';
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (
    id,
    email,
    name,
    subscription_plan,
    subscription_status,
    trial_started_at,
    trial_ends_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'trial',
    'trial',
    now(),
    now() + interval '7 days'
  );

  return new;
end;
$function$;

-- ATENÇÃO: em produção esta função insere numa coluna `payload` que não existe em
-- woovi_webhooks_raw. Qualquer chamada falha. Mantida como está (legado).
CREATE OR REPLACE FUNCTION public.handle_woovi_webhook(payload jsonb DEFAULT '{}'::jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- Registra no histórico para você ver que funcionou
  insert into public.woovi_webhooks_raw (payload)
  values (payload);

  -- Retorna o objeto puro com HTTP 200 que a Woovi tanto quer
  return json_build_object('success', true, 'status', 'validado');
end;
$function$;

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(query_embedding vector, match_threshold double precision, match_count integer, p_user_id uuid)
 RETURNS TABLE(id uuid, document_id uuid, content text, similarity double precision)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select
    id,
    document_id,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from public.knowledge_chunks
  where user_id = p_user_id
    and embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$function$;

CREATE OR REPLACE FUNCTION public.nexjud_settle_paid_order(p_correlation_id text, p_payment_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_order public.payment_orders%rowtype;
  v_sub public.subscriptions%rowtype;
  v_now timestamptz := transaction_timestamp();
  v_begin timestamptz;
  v_end timestamptz;
  v_expected integer;
  v_rank_old integer;
  v_rank_new integer;
begin
  if length(coalesce(p_correlation_id, '')) < 4 or length(p_correlation_id) > 128 then
    raise exception 'invalid_correlation_id';
  end if;
  select * into v_order from public.payment_orders
  where correlation_id = p_correlation_id for update;
  if not found then raise exception 'payment_order_not_found'; end if;
  if v_order.provider <> 'woovi' or v_order.plan not in ('pro','intelligence','enterprise','enterprise_plus') then
    raise exception 'invalid_payment_order';
  end if;
  v_expected := case v_order.plan
    when 'pro' then 19700
    when 'intelligence' then 39700
    when 'enterprise' then 79700
    when 'enterprise_plus' then 149700
    else -1 end;
  if v_order.amount_cents <> v_expected then raise exception 'payment_amount_mismatch'; end if;

  if v_order.status = 'paid' then
    return jsonb_build_object('paid',true,'duplicate',true);
  end if;
  if v_order.status <> 'pending' then raise exception 'payment_order_not_pending'; end if;

  -- Serializes different paid orders for the same user and avoids lost monthly extensions.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_order.user_id::text, 773)
  );
  select * into v_sub from public.subscriptions
    where user_id = v_order.user_id for update;

  v_rank_old := case v_sub.plan
    when 'pro' then 1 when 'intelligence' then 2
    when 'enterprise' then 3 when 'enterprise_plus' then 4 else 0 end;
  v_rank_new := case v_order.plan
    when 'pro' then 1 when 'intelligence' then 2
    when 'enterprise' then 3 when 'enterprise_plus' then 4 else 0 end;

  -- An active paid legacy entitlement without a recorded expiry may be
  -- contractual/perpetual. Never replace it implicitly with a paid month.
  -- Combined with the Edge checkout guard, this is defence in depth for
  -- orders issued before the checkout protection was deployed.
  if v_sub.active is true and v_sub.status = 'active'
     and v_rank_old > 0 and v_sub.current_period_end is null then
    raise exception 'legacy_paid_subscription_reconciliation_required';
  end if;

  if v_sub.active is true and v_sub.status = 'active'
     and v_sub.current_period_end > v_now and v_rank_old > v_rank_new then
    -- A lower plan paid while higher tier is active requires an explicit
    -- scheduled downgrade or refund, never an implicit loss of customer access.
    raise exception 'manual_plan_downgrade_reconciliation_required';
  end if;

  v_begin := case
    when v_sub.active is true and v_sub.status='active'
       and v_sub.plan=v_order.plan and v_sub.current_period_end > v_now
      then v_sub.current_period_end
    else v_now
    end;
  v_end := v_begin + interval '1 month';

  insert into public.subscriptions (
    user_id, plan, plan_type, status, active, current_period_start,
    current_period_end, payment_provider, provider_subscription_id, updated_at
  ) values (
    v_order.user_id, v_order.plan, v_order.plan, 'active', true, v_begin,
    v_end, 'woovi', p_correlation_id, v_now
  )
  on conflict (user_id) do update set
    plan = excluded.plan, plan_type=excluded.plan_type, status='active',
    active=true, current_period_start=excluded.current_period_start,
    current_period_end=excluded.current_period_end,
    payment_provider='woovi', provider_subscription_id=p_correlation_id,
    updated_at=v_now;

  update public.payment_orders
    set status='paid', paid_at=v_now, raw=coalesce(p_payment_metadata, '{}'::jsonb)
    where id=v_order.id;

  return jsonb_build_object('paid',true,'duplicate',false,'current_period_end',v_end);
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_legal_case_dossier_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin new.updated_at = now(); return new; end $function$;

CREATE OR REPLACE FUNCTION public.touch_process_movement_event_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_strategic_memory_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ begin new.updated_at=now(); return new; end $function$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER trg_touch_legal_case_dossier BEFORE UPDATE ON public.legal_case_dossiers FOR EACH ROW EXECUTE FUNCTION public.touch_legal_case_dossier_updated_at();
CREATE TRIGGER trg_touch_process_movement_event BEFORE UPDATE ON public.legal_process_movement_events FOR EACH ROW EXECUTE FUNCTION public.touch_process_movement_event_updated_at();
CREATE TRIGGER trg_touch_strategic_memory BEFORE UPDATE ON public.legal_strategic_memories FOR EACH ROW EXECUTE FUNCTION public.touch_strategic_memory_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security: ligado em todas as 45 tabelas
-- -----------------------------------------------------------------------------

alter table public.account_deletion_requests enable row level security;
alter table public.ai_copilot_sessions enable row level security;
alter table public.analysis_history enable row level security;
alter table public.board_reports enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.client_risk_cache enable row level security;
alter table public.cnj_processes enable row level security;
alter table public.drafts enable row level security;
alter table public.favorites enable row level security;
alter table public.internal_access enable row level security;
alter table public.judge_sessions enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.legal_agent_runs enable row level security;
alter table public.legal_case_dossiers enable row level security;
alter table public.legal_case_outcomes enable row level security;
alter table public.legal_case_precedent_impacts enable row level security;
alter table public.legal_cases enable row level security;
alter table public.legal_intelligence_reports enable row level security;
alter table public.legal_jurisprudence enable row level security;
alter table public.legal_memory enable row level security;
alter table public.legal_morning_briefs enable row level security;
alter table public.legal_precedent_analyses enable row level security;
alter table public.legal_precedent_analysis_items enable row level security;
alter table public.legal_precedent_events enable row level security;
alter table public.legal_precedent_evidence_matrix enable row level security;
alter table public.legal_precedent_fact_matrix enable row level security;
alter table public.legal_precedent_monitors enable row level security;
alter table public.legal_precedents enable row level security;
alter table public.legal_process_movement_events enable row level security;
alter table public.legal_strategic_memories enable row level security;
alter table public.litigation_strategies enable row level security;
alter table public.one_click_actions_log enable row level security;
alter table public.opponent_database enable row level security;
alter table public.opponent_intelligence_cache enable row level security;
alter table public.partner_council_sessions enable row level security;
alter table public.payment_orders enable row level security;
alter table public.profiles enable row level security;
alter table public.strategic_analyses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.tribunal_dna_cache enable row level security;
alter table public.tribunal_heatmap enable row level security;
alter table public.war_room_sessions enable row level security;
alter table public.woovi_webhooks_raw enable row level security;

-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------

create policy account_deletion_requests_insert_own on public.account_deletion_requests as PERMISSIVE for INSERT to authenticated
  with check (((auth.uid() = user_id) AND (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))) AND (status = 'requested'::text)));
create policy account_deletion_requests_select_own on public.account_deletion_requests as PERMISSIVE for SELECT to authenticated
  using ((auth.uid() = user_id));
create policy "Users can delete own copilot sessions" on public.ai_copilot_sessions as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy "Users can insert own copilot sessions" on public.ai_copilot_sessions as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy "Users can view own copilot sessions" on public.ai_copilot_sessions as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy "Users can delete own analysis history" on public.analysis_history as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy "Users can insert own analysis history" on public.analysis_history as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy "Users can insert their own analyses" on public.analysis_history as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy "Users can read own analysis history" on public.analysis_history as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy "Users can view their own analyses" on public.analysis_history as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy "users own rows" on public.board_reports as PERMISSIVE for ALL to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy chat_messages_delete_own on public.chat_messages as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy chat_messages_insert_own on public.chat_messages as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy chat_messages_select_own on public.chat_messages as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy chat_sessions_delete_own on public.chat_sessions as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy chat_sessions_insert_own on public.chat_sessions as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy chat_sessions_select_own on public.chat_sessions as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy chat_sessions_update_own on public.chat_sessions as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "users own rows" on public.client_risk_cache as PERMISSIVE for ALL to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy cnj_delete on public.cnj_processes as PERMISSIVE for DELETE to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));
create policy cnj_insert on public.cnj_processes as PERMISSIVE for INSERT to authenticated
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy cnj_select on public.cnj_processes as PERMISSIVE for SELECT to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));
create policy cnj_update on public.cnj_processes as PERMISSIVE for UPDATE to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users can delete own drafts" on public.drafts as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy "Users can insert own drafts" on public.drafts as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy "Users can view own drafts" on public.drafts as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy "Users can delete their own favorites" on public.favorites as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy "Users can insert their own favorites" on public.favorites as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy "Users can view their own favorites" on public.favorites as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy internal_access_read_own on public.internal_access as PERMISSIVE for SELECT to authenticated
  using ((auth.uid() = user_id));
create policy "Users can delete own judge sessions" on public.judge_sessions as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy "Users can insert own judge sessions" on public.judge_sessions as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy "Users can view own judge sessions" on public.judge_sessions as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy knowledge_chunks_delete_own on public.knowledge_chunks as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy knowledge_chunks_insert_own on public.knowledge_chunks as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy knowledge_chunks_select_own on public.knowledge_chunks as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy knowledge_documents_delete_own on public.knowledge_documents as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy knowledge_documents_insert_own on public.knowledge_documents as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy knowledge_documents_select_own on public.knowledge_documents as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy knowledge_documents_update_own on public.knowledge_documents as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "users own agent runs" on public.legal_agent_runs as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "users own dossiers" on public.legal_case_dossiers as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "users own outcomes" on public.legal_case_outcomes as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "case precedent impacts own rows" on public.legal_case_precedent_impacts as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy legal_cases_delete_own on public.legal_cases as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy legal_cases_insert_own on public.legal_cases as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy legal_cases_select_own on public.legal_cases as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy legal_cases_update_own on public.legal_cases as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "users own rows" on public.legal_intelligence_reports as PERMISSIVE for ALL to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users can delete own jurisprudence" on public.legal_jurisprudence as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy "Users can insert own jurisprudence" on public.legal_jurisprudence as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy "Users can update own jurisprudence" on public.legal_jurisprudence as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id));
create policy "Users can view own jurisprudence" on public.legal_jurisprudence as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy legal_memory_delete_own on public.legal_memory as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy legal_memory_insert_own on public.legal_memory as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy legal_memory_select_own on public.legal_memory as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy legal_memory_update_own on public.legal_memory as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "users insert own morning briefs" on public.legal_morning_briefs as PERMISSIVE for INSERT to authenticated
  with check ((auth.uid() = user_id));
create policy "users read own morning briefs" on public.legal_morning_briefs as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy "users update own morning briefs" on public.legal_morning_briefs as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "precedent analyses own rows" on public.legal_precedent_analyses as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "precedent analysis items own rows" on public.legal_precedent_analysis_items as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "precedent events own rows" on public.legal_precedent_events as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "precedent evidence matrix own rows" on public.legal_precedent_evidence_matrix as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "precedent fact matrix own rows" on public.legal_precedent_fact_matrix as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "precedent monitors own rows" on public.legal_precedent_monitors as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy precedents_delete on public.legal_precedents as PERMISSIVE for DELETE to public
  using ((auth.uid() = user_id));
create policy precedents_insert on public.legal_precedents as PERMISSIVE for INSERT to public
  with check ((auth.uid() = user_id));
create policy precedents_select on public.legal_precedents as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));
create policy precedents_update on public.legal_precedents as PERMISSIVE for UPDATE to public
  using ((auth.uid() = user_id));
create policy "users own process movement events" on public.legal_process_movement_events as PERMISSIVE for ALL to authenticated
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "users own strategic memories" on public.legal_strategic_memories as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "users own rows" on public.litigation_strategies as PERMISSIVE for ALL to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "users own rows" on public.one_click_actions_log as PERMISSIVE for ALL to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "users own rows" on public.opponent_database as PERMISSIVE for ALL to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "users own rows" on public.opponent_intelligence_cache as PERMISSIVE for ALL to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "users own rows" on public.partner_council_sessions as PERMISSIVE for ALL to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "users read own payment orders" on public.payment_orders as PERMISSIVE for SELECT to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users can update their own profile" on public.profiles as PERMISSIVE for UPDATE to public
  using ((auth.uid() = id));
create policy "Users can view their own profile" on public.profiles as PERMISSIVE for SELECT to public
  using ((auth.uid() = id));
create policy users_own_analyses on public.strategic_analyses as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy "users read own subscription" on public.subscriptions as PERMISSIVE for SELECT to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));
create policy "users own rows" on public.tribunal_dna_cache as PERMISSIVE for ALL to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "users own rows" on public.tribunal_heatmap as PERMISSIVE for ALL to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "users own rows" on public.war_room_sessions as PERMISSIVE for ALL to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
-- ATENÇÃO: permite INSERT anônimo (qualquer pessoa com a anon key).
create policy "Permitir inserção pública" on public.woovi_webhooks_raw as PERMISSIVE for INSERT to public
  with check (true);

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------

-- ATENÇÃO: em produção o bucket knowledge-files está como PÚBLICO.
-- Arquivos enviados à base de conhecimento abrem por URL sem login.
insert into storage.buckets (id, name, public) values ('knowledge-files', 'knowledge-files', true)
on conflict (id) do nothing;
