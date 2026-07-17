create table if not exists public.automation_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  case_id uuid null,
  type text not null default 'general',
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  title text not null,
  message text not null,
  action_url text null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed','read')),
  created_at timestamptz not null default now(),
  sent_at timestamptz null,
  read_at timestamptz null
);

create index if not exists automation_notifications_user_created_idx
  on public.automation_notifications (user_id, created_at desc);

create index if not exists automation_notifications_status_idx
  on public.automation_notifications (status, created_at desc);

alter table public.automation_notifications enable row level security;

create policy "Users can read their own automation notifications"
  on public.automation_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can mark their own automation notifications as read"
  on public.automation_notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.automation_notifications is
  'Central de notificações produzidas pelas automações n8n do NexJud.';
