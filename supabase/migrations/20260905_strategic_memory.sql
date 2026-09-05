-- NexJud Strategic Memory / Outcome Learning
create table if not exists public.legal_strategic_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.legal_cases(id) on delete cascade,
  area text,
  issue text,
  situation text,
  strategy text,
  action_taken text,
  result_status text,
  result_summary text,
  lesson text not null,
  confidence_score integer check (confidence_score is null or confidence_score between 0 and 100),
  reusable boolean not null default true,
  source_outcome_id uuid references public.legal_case_outcomes(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_strategic_memories_user on public.legal_strategic_memories(user_id, created_at desc);
create index if not exists idx_strategic_memories_area on public.legal_strategic_memories(user_id, area, issue);
alter table public.legal_strategic_memories enable row level security;
drop policy if exists "users own strategic memories" on public.legal_strategic_memories;
create policy "users own strategic memories" on public.legal_strategic_memories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function public.touch_strategic_memory_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists trg_touch_strategic_memory on public.legal_strategic_memories;
create trigger trg_touch_strategic_memory before update on public.legal_strategic_memories for each row execute function public.touch_strategic_memory_updated_at();