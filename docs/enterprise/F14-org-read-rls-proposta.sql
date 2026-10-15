-- F14 REVIEW ONLY — NOT APPLIED to Supabase.
-- Apply only after F7 in a disposable PostgreSQL staging database.
-- Enables SELECT for authenticated users on their own organization only.
-- Import/audit tables remain fully closed. No direct INSERT/UPDATE/DELETE grants.
begin;

-- SECURITY DEFINER avoids policy recursion when membership checks read memberships.
-- Fixed search_path and explicit schema references. Execute restricted to authenticated.
create or replace function public.enterprise_is_member(target_organization uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enterprise_memberships m
    where m.organization_id = target_organization
      and m.user_id = auth.uid()
  );
$$;
revoke all on function public.enterprise_is_member(uuid) from public, anon;
grant execute on function public.enterprise_is_member(uuid) to authenticated;

create policy enterprise_org_member_read
on public.enterprise_organizations
for select to authenticated
using (public.enterprise_is_member(id));

create policy enterprise_membership_self_read
on public.enterprise_memberships
for select to authenticated
using (
  user_id = auth.uid()
  and public.enterprise_is_member(organization_id)
);

grant select on public.enterprise_organizations to authenticated;
grant select on public.enterprise_memberships to authenticated;

commit;
