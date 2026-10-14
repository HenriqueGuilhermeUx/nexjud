-- Disposable PostgreSQL ONLY. Run after F7, F15, F14, F20.
begin;
insert into auth.users(id) values
 ('11111111-3333-4333-8333-111111111111'),
 ('22222222-3333-4333-8333-222222222222'),
 ('33333333-3333-4333-8333-333333333333'),
 ('44444444-3333-4333-8333-444444444444'),
 ('55555555-3333-4333-8333-555555555555'),
 ('66666666-3333-4333-8333-666666666666');
insert into public.enterprise_organizations(id,name,created_by) values
 ('77777777-3333-4333-8333-777777777777','Import roles tenant','11111111-3333-4333-8333-111111111111'),
 ('88888888-3333-4333-8333-888888888888','Other tenant','66666666-3333-4333-8333-666666666666');
insert into public.enterprise_memberships(organization_id,user_id,role) values
 ('77777777-3333-4333-8333-777777777777','11111111-3333-4333-8333-111111111111','owner'),
 ('77777777-3333-4333-8333-777777777777','22222222-3333-4333-8333-222222222222','admin'),
 ('77777777-3333-4333-8333-777777777777','33333333-3333-4333-8333-333333333333','legal'),
 ('77777777-3333-4333-8333-777777777777','44444444-3333-4333-8333-444444444444','reviewer'),
 ('77777777-3333-4333-8333-777777777777','55555555-3333-4333-8333-555555555555','reader'),
 ('88888888-3333-4333-8333-888888888888','66666666-3333-4333-8333-666666666666','owner');

set local role authenticated;
do $$
declare
  user_ids uuid[] := array[
    '11111111-3333-4333-8333-111111111111'::uuid,
    '22222222-3333-4333-8333-222222222222'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    '44444444-3333-4333-8333-444444444444'::uuid,
    '55555555-3333-4333-8333-555555555555'::uuid,
    '66666666-3333-4333-8333-666666666666'::uuid
  ];
  i integer;
  permitted boolean;
begin
  for i in 1..6 loop
    perform set_config('request.jwt.claim.sub',user_ids[i]::text,true);
    permitted := public.enterprise_can_import('77777777-3333-4333-8333-777777777777');
    if permitted is distinct from (i <= 3) then
      raise exception 'Import authorization mismatch for role index %',i;
    end if;
    if public.enterprise_can_import('99999999-3333-4333-8333-999999999999') then
      raise exception 'Unknown organization accepted';
    end if;
  end loop;
end $$;
reset role;
set local role anon;
do $$
declare blocked boolean := false;
begin
 begin
  perform public.enterprise_can_import('77777777-3333-4333-8333-777777777777');
 exception when insufficient_privilege then blocked := true;
 end;
 if not blocked then raise exception 'Anonymous import permission helper execution allowed'; end if;
end $$;
reset role;
rollback;
