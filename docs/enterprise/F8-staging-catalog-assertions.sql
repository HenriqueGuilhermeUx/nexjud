-- NexJud Enterprise F8: read-only catalog verification.
-- Run ONLY in a disposable staging database AFTER the F7 schema is applied.
-- Does not create or modify objects or test live user access.
DO $$
DECLARE
  target_table text;
  rls_on boolean;
  policy_count integer;
  public_grants integer;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'enterprise_organizations','enterprise_memberships',
    'enterprise_import_batches','enterprise_import_items','enterprise_import_audit'
  ] LOOP
    SELECT c.relrowsecurity INTO rls_on
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=target_table AND c.relkind='r';
    IF rls_on IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Missing RLS on %', target_table;
    END IF;

    SELECT count(*) INTO policy_count FROM pg_policies
    WHERE schemaname='public' AND tablename=target_table;
    IF policy_count <> 0 THEN
      RAISE EXCEPTION 'Expected deny-by-default with zero policies on %, got %',target_table,policy_count;
    END IF;

    SELECT count(*) INTO public_grants
    FROM information_schema.role_table_grants
    WHERE table_schema='public' AND target_table=target_table
      AND grantee IN ('anon','authenticated')
      AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER');
    IF public_grants <> 0 THEN
      RAISE EXCEPTION 'Unexpected client role grants on %',target_table;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.enterprise_import_batches'::regclass
      AND contype='u'
      AND pg_get_constraintdef(oid) LIKE '%(organization_id, idempotency_key)%'
  ) THEN
    RAISE EXCEPTION 'Missing per-organization idempotency uniqueness';
  END IF;

  RAISE NOTICE 'Enterprise F8 catalog assertions passed (not a substitute for multi-user RLS tests)';
END $$;
