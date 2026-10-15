-- Free isolated PostgreSQL staging; no customer data.
\set ON_ERROR_STOP on
DO $$
BEGIN
 IF has_table_privilege('authenticated','public.subscriptions','INSERT')
 OR has_table_privilege('authenticated','public.subscriptions','UPDATE')
 OR has_table_privilege('authenticated','public.payment_orders','UPDATE')
 OR has_function_privilege('authenticated','billing_private.apply_confirmed_payment(text,integer)','EXECUTE') THEN
  RAISE EXCEPTION 'Unauthorized billing write permission';
 END IF;
 IF NOT has_function_privilege('service_role','billing_private.apply_confirmed_payment(text,integer)','EXECUTE') THEN
  RAISE EXCEPTION 'Service role cannot use activation RPC';
 END IF;
END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.payment_orders)<>2 OR
 (SELECT count(*) FROM public.subscriptions)<>0 THEN
 RAISE EXCEPTION 'Billing row level security failed'; END IF;
END $$;
RESET ROLE;
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id='00000000-0000-4000-8000-000000000001') THEN
  RAISE EXCEPTION 'Pending Pix granted a subscription'; END IF;
END $$;
SET ROLE service_role;
SELECT billing_private.apply_confirmed_payment('test-pro-1',19700);
RESET ROLE;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.subscriptions WHERE
 user_id='00000000-0000-4000-8000-000000000001'
 AND plan='pro' AND status='active' AND active IS TRUE AND paid_until>now()) THEN
  RAISE EXCEPTION 'Confirmed Pix did not grant one paid month'; END IF;
END $$;
CREATE TEMP TABLE initial_expiry AS SELECT paid_until AS expiry FROM public.subscriptions
 WHERE user_id='00000000-0000-4000-8000-000000000001';
SET ROLE service_role;
DO $$
BEGIN
 IF billing_private.apply_confirmed_payment('test-pro-1',19700) THEN
  RAISE EXCEPTION 'Replay counted as new payment'; END IF;
END $$;
RESET ROLE;
DO $$
BEGIN
 IF (SELECT paid_until FROM public.subscriptions WHERE user_id='00000000-0000-4000-8000-000000000001')
 <> (SELECT expiry FROM initial_expiry) THEN
 RAISE EXCEPTION 'Repeated webhook extended paid access'; END IF;
END $$;
SET ROLE service_role;
SELECT billing_private.apply_confirmed_payment('test-renewal-1',19700);
RESET ROLE;
DO $$
BEGIN
 IF (SELECT paid_until FROM public.subscriptions WHERE user_id='00000000-0000-4000-8000-000000000001')
 < (SELECT expiry+interval '1 month' FROM initial_expiry) THEN
  RAISE EXCEPTION 'Valid renewal failed to extend the paid month'; END IF;
END $$;
UPDATE public.subscriptions SET paid_until=now()+interval '1 month'
 WHERE user_id='00000000-0000-4000-8000-000000000002';
SET ROLE service_role;
SELECT billing_private.apply_confirmed_payment('test-old-plan-2',19700);
RESET ROLE;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.subscriptions WHERE
 user_id='00000000-0000-4000-8000-000000000002' AND plan='enterprise') THEN
  RAISE EXCEPTION 'Old order downgraded an existing Enterprise user'; END IF;
END $$;
DO $$
BEGIN
 BEGIN
  PERFORM billing_private.apply_confirmed_payment('test-failure-3',39700);
  RAISE EXCEPTION 'Bad amount accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='Bad amount accepted' THEN RAISE; END IF;
 END;
 IF EXISTS(SELECT 1 FROM public.subscriptions
 WHERE user_id='00000000-0000-4000-8000-000000000003') THEN
  RAISE EXCEPTION 'Invalid amount activated a paid plan'; END IF;
END $$;
CREATE FUNCTION public.fail_paid_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.correlation_id='test-failure-3' AND NEW.status='paid' THEN
  RAISE EXCEPTION 'Injected failure'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER local_fail_paid BEFORE UPDATE ON public.payment_orders
 FOR EACH ROW EXECUTE FUNCTION public.fail_paid_update();
DO $$
BEGIN
 BEGIN
  PERFORM billing_private.apply_confirmed_payment('test-failure-3',19700);
  RAISE EXCEPTION 'Simulated failure not detected';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='Simulated failure not detected' THEN RAISE; END IF;
 END;
 IF EXISTS(SELECT 1 FROM public.subscriptions
 WHERE user_id='00000000-0000-4000-8000-000000000003') THEN
  RAISE EXCEPTION 'Partial activation did not roll back'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.payment_orders
 WHERE correlation_id='test-failure-3' AND status='pending') THEN
  RAISE EXCEPTION 'Failed order was marked paid'; END IF;
END $$;
DROP TRIGGER local_fail_paid ON public.payment_orders;
DROP FUNCTION public.fail_paid_update();
DO $$BEGIN RAISE NOTICE 'PASS billing: RLS, expiry, retry, rollback, no downgrade'; END$$;
