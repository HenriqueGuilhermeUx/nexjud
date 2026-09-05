drop policy if exists "users insert own morning briefs" on public.legal_morning_briefs;
create policy "users insert own morning briefs"
on public.legal_morning_briefs
for insert
to authenticated
with check (auth.uid() = user_id);
