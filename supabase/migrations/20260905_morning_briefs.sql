create table if not exists public.legal_morning_briefs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 brief_date date not null default current_date,
 executive_summary text,
 payload jsonb not null default '{}'::jsonb,
 status text not null default 'ready',
 read_at timestamptz,
 created_at timestamptz not null default now(),
 unique(user_id, brief_date)
);
create index if not exists idx_legal_morning_briefs_user_date on public.legal_morning_briefs(user_id, brief_date desc);
alter table public.legal_morning_briefs enable row level security;
drop policy if exists "users read own morning briefs" on public.legal_morning_briefs;
create policy "users read own morning briefs" on public.legal_morning_briefs for select using (auth.uid()=user_id);
drop policy if exists "users update own morning briefs" on public.legal_morning_briefs;
create policy "users update own morning briefs" on public.legal_morning_briefs for update using (auth.uid()=user_id) with check (auth.uid()=user_id);