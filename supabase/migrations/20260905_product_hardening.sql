-- NexJud product hardening: RLS-safe metrics + idempotent strategic learning

-- Make the outcome metrics view execute with the querying user's privileges so
-- RLS on legal_case_outcomes remains effective for authenticated users.
alter view public.legal_case_outcome_metrics set (security_invoker = true);

-- One reusable learning record per source outcome. Prevents repeated calls to
-- outcome-learning-ai from duplicating institutional memory.
create unique index if not exists uq_strategic_memories_source_outcome
  on public.legal_strategic_memories(source_outcome_id)
  where source_outcome_id is not null;

comment on index public.uq_strategic_memories_source_outcome is
  'Prevents duplicate strategic-memory extraction for the same legal case outcome.';
