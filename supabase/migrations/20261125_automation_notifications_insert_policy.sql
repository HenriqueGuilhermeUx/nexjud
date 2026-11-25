-- Aplicada em produção em 2026-11-25 junto com 20260717_create_automation_notifications.sql,
-- que estava no repo mas nunca tinha sido aplicada.
-- process-movement-impact grava a notificação com o token do próprio usuário.
create policy "Users can insert their own automation notifications"
  on public.automation_notifications
  for insert
  to authenticated
  with check (auth.uid() = user_id);
