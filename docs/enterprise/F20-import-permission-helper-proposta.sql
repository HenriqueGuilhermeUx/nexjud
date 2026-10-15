-- REVIEW ONLY: disposable staging; never apply directly to production.
-- Run after F7, F15, F14. Read-only helper, NOT an import endpoint.
begin;
create or replace function public.enterprise_can_import(target_organization uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enterprise_memberships m
    where m.organization_id = target_organization
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','legal')
  );
$$;
revoke all on function public.enterprise_can_import(uuid) from public, anon;
grant execute on function public.enterprise_can_import(uuid) to authenticated;
commit;
