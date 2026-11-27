-- Custos de provedores de dados (Escavador) e cache da busca por OAB.
-- Só as Edge Functions (service role) leem e escrevem; RLS ligado sem políticas.

create table if not exists public.provider_usage (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  route text not null,
  credits_cents integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists provider_usage_user_route_idx on public.provider_usage (user_id, route, created_at desc);
create index if not exists provider_usage_created_idx on public.provider_usage (created_at desc);
alter table public.provider_usage enable row level security;

create table if not exists public.oab_lookup_cache (
  oab_key text primary key,          -- sha-256 de UF + número + tipo
  payload jsonb not null,
  cached_at timestamptz not null default now()
);
alter table public.oab_lookup_cache enable row level security;

revoke all on public.provider_usage from anon, authenticated;
revoke all on public.oab_lookup_cache from anon, authenticated;
