-- Contexto do DNA do Juiz (capa, publicações do processo e amostra do juízo) por 24 h,
-- para o usuário trocar a tese e rodar de novo sem pagar outra consulta ao Escavador.
-- Só as Edge Functions (service role) acessam; RLS ligado sem políticas.
create table if not exists public.dna_context_cache (
  cnj_hash text primary key,
  payload jsonb not null,
  cached_at timestamptz not null default now()
);
alter table public.dna_context_cache enable row level security;
revoke all on public.dna_context_cache from anon, authenticated;
