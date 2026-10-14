-- Disposable PostgreSQL staging ONLY. Run after F7/F8/F10/F11.
-- Unlike catalog checks, these exercise SQL as real database roles.
begin;
do $$
declare
  target text;
  client_role text;
  rejected boolean;
begin
  foreach client_role in array array['anon','authenticated'] loop
    foreach target in array array[
      'enterprise_organizations','enterprise_memberships',
      'enterprise_import_batches','enterprise_import_items',
      'enterprise_import_audit'
    ] loop
      rejected := false;
      begin
        execute format('set local role %I',client_role);
        execute format('select 1 from public.%I limit 1',target);
      exception when insufficient_privilege then
        rejected := true;
      end;
      reset role;
      if not rejected then
        raise exception 'Role % unexpectedly read %',client_role,target;
      end if;
    end loop;
  end loop;
end $$;
rollback;
