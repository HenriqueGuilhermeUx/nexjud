-- Segredos de automação (agendador do monitor e webhook do Escavador).
-- Só as Edge Functions (service role) leem; RLS ligado sem políticas, sem acesso para anon/authenticated.
-- Os valores são gravados fora do repositório.
create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
