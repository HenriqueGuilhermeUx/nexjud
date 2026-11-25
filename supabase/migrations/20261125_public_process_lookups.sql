-- Registro mínimo das consultas grátis pelo número CNJ (landing page), usado só para
-- limitar abuso. Guarda o hash do IP e do número consultado, nunca o IP nem o número.
create table if not exists public.public_process_lookups (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  cnj_hash text not null,
  court_alias text,
  found boolean,
  created_at timestamptz not null default now()
);

create index if not exists public_process_lookups_ip_created_idx
  on public.public_process_lookups (ip_hash, created_at desc);

create index if not exists public_process_lookups_created_idx
  on public.public_process_lookups (created_at desc);

-- RLS ligado e sem policies: só a Edge Function (service role) lê e grava.
alter table public.public_process_lookups enable row level security;
