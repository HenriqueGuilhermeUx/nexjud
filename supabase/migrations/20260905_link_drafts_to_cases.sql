-- NexJud: connect strategy-driven drafts to their legal case
alter table public.drafts
  add column if not exists case_id uuid references public.legal_cases(id) on delete set null;

create index if not exists idx_drafts_case_id on public.drafts(case_id, created_at desc);
