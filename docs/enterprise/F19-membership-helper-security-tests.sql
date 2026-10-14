-- Disposable PostgreSQL staging ONLY. Run after F7, F15, F14.
begin;
insert into auth.users(id) values
 ('aaaaaaaa-2222-4222-8222-222222222222'),
 ('bbbbbbbb-2222-4222-8222-222222222222');
insert into public.enterprise_organizations(id,name,created_by) values
 ('cccccccc-2222-4222-8222-222222222222','Helper A','aaaaaaaa-2222-4222-8222-222222222222'),
 ('dddddddd-2222-4222-8222-222222222222','Helper B','bbbbbbbb-2222-4222-8222-222222222222');
insert into public.enterprise_memberships(organization_id,user_id,role) values
 ('cccccccc-2222-4222-8222-222222222222','aaaaaaaa-2222-4222-8222-222222222222','reader'),
 ('dddddddd-2222-4222-8222-222222222222','bbbbbbbb-2222-4222-8222-222222222222','owner');

set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-2222-4222-8222-222222222222',true);
do $$
begin
 if not public.enterprise_is_member('cccccccc-2222-4222-8222-222222222222')
 then raise exception 'Own membership incorrectly rejected'; end if;
 if public.enterprise_is_member('dddddddd-2222-4222-8222-222222222222')
 then raise exception 'Foreign membership incorrectly accepted'; end if;
 if public.enterprise_is_member('eeeeeeee-2222-4222-8222-222222222222')
 then raise exception 'Unknown organization incorrectly accepted'; end if;
end $$;
reset role;

set local role anon;
do $$
declare blocked boolean := false;
begin
 begin
  perform public.enterprise_is_member('cccccccc-2222-4222-8222-222222222222');
 exception when insufficient_privilege then blocked := true;
 end;
 if not blocked then raise exception 'Anonymous role invoked membership helper'; end if;
end $$;
reset role;
rollback;
