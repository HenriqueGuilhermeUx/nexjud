-- Aplicada em produção em 2026-11-25.
-- outcome-learning-ai faz upsert(onConflict: "source_outcome_id"); sem este índice o upsert falha.
create unique index if not exists legal_strategic_memories_source_outcome_id_key
  on public.legal_strategic_memories (source_outcome_id);
