-- PROPOSAL. Only execute in disposable PostgreSQL CI (never hosted production).
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS paid_until timestamptz;
CREATE SCHEMA IF NOT EXISTS billing_private;
REVOKE ALL ON SCHEMA billing_private FROM PUBLIC;
GRANT USAGE ON SCHEMA billing_private TO service_role;

-- Trusted server must FIRST verify Woovi event authenticity and payment value.
CREATE OR REPLACE FUNCTION billing_private.apply_confirmed_payment(
 p_correlation_id text,p_amount_cents integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 o public.payment_orders%ROWTYPE;
 s public.subscriptions%ROWTYPE;
 old_rank integer;
 new_rank integer;
 keep_higher boolean;
BEGIN
 IF p_correlation_id IS NULL OR length(trim(p_correlation_id))<3
    OR p_amount_cents IS NULL OR p_amount_cents<=0 THEN
  RAISE EXCEPTION 'Invalid payment input';
 END IF;
 SELECT * INTO o FROM public.payment_orders WHERE correlation_id=p_correlation_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown payment'; END IF;
 IF o.provider<>'woovi' OR o.amount_cents<>p_amount_cents THEN
  RAISE EXCEPTION 'Payment provider or amount mismatch';
 END IF;
 IF o.status='paid' THEN RETURN false; END IF;
 IF o.status<>'pending' THEN RAISE EXCEPTION 'Order not payable'; END IF;
 IF o.plan NOT IN ('pro','intelligence','enterprise','enterprise_plus') THEN
  RAISE EXCEPTION 'Unknown plan';
 END IF;
 SELECT * INTO s FROM public.subscriptions WHERE user_id=o.user_id FOR UPDATE;
 old_rank:=CASE s.plan WHEN 'pro' THEN 1 WHEN 'intelligence' THEN 2
  WHEN 'enterprise' THEN 3 WHEN 'enterprise_plus' THEN 4 ELSE 0 END;
 new_rank:=CASE o.plan WHEN 'pro' THEN 1 WHEN 'intelligence' THEN 2
  WHEN 'enterprise' THEN 3 WHEN 'enterprise_plus' THEN 4 ELSE 0 END;
 keep_higher:=FOUND AND s.active IS TRUE AND s.status='active'
   AND old_rank>new_rank AND (s.paid_until IS NULL OR s.paid_until>now());
 IF NOT keep_higher THEN
  INSERT INTO public.subscriptions
   (user_id,plan,status,active,payment_provider,provider_subscription_id,paid_until,updated_at)
  VALUES (o.user_id,o.plan,'active',true,'woovi',o.correlation_id,
    now()+interval '1 month',now())
  ON CONFLICT(user_id) DO UPDATE SET
   plan=EXCLUDED.plan,status='active',active=true,payment_provider='woovi',
   provider_subscription_id=EXCLUDED.provider_subscription_id,
   paid_until=greatest(coalesce(public.subscriptions.paid_until,now()),now())+interval '1 month',
   updated_at=now();
 END IF;
 UPDATE public.payment_orders SET status='paid',paid_at=now()
 WHERE id=o.id AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Order update failed'; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION billing_private.apply_confirmed_payment(text,integer)
 FROM PUBLIC,authenticated;
GRANT EXECUTE ON FUNCTION billing_private.apply_confirmed_payment(text,integer)
 TO service_role;
