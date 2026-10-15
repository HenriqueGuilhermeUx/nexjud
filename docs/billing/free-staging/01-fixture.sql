-- DISPOSABLE TEST DATABASE ONLY; all accounts below are invented.
CREATE SCHEMA auth;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.subscriptions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL UNIQUE, plan_type text DEFAULT 'free',
 status text DEFAULT 'active', created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now(), woovi_subscription_id text,
 plan text DEFAULT 'trial', active boolean DEFAULT true,
 trial_start timestamptz DEFAULT now(), trial_end timestamptz DEFAULT (now()+interval '7 days'),
 payment_provider text, provider_customer_id text, provider_subscription_id text
);
CREATE TABLE public.payment_orders(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 plan text NOT NULL, amount_cents integer NOT NULL,
 provider text NOT NULL DEFAULT 'woovi', status text NOT NULL DEFAULT 'pending',
 correlation_id text NOT NULL UNIQUE, br_code text, qr_code_image text,
 payment_link text, raw jsonb, paid_at timestamptz, created_at timestamptz DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscriptions,public.payment_orders FROM PUBLIC,authenticated;
GRANT USAGE ON SCHEMA public,auth TO authenticated;
GRANT SELECT ON public.subscriptions,public.payment_orders TO authenticated;
CREATE POLICY owner_subscription ON public.subscriptions FOR SELECT TO authenticated
 USING ((SELECT auth.uid())=user_id);
CREATE POLICY owner_payment_order ON public.payment_orders FOR SELECT TO authenticated
 USING ((SELECT auth.uid())=user_id);
INSERT INTO public.payment_orders(user_id,plan,amount_cents,correlation_id) VALUES
 ('00000000-0000-4000-8000-000000000001','pro',19700,'test-pro-1'),
 ('00000000-0000-4000-8000-000000000002','pro',19700,'test-old-plan-2'),
 ('00000000-0000-4000-8000-000000000003','pro',19700,'test-failure-3'),
 ('00000000-0000-4000-8000-000000000001','pro',19700,'test-renewal-1');
INSERT INTO public.subscriptions(user_id,plan,status,active,payment_provider) VALUES
 ('00000000-0000-4000-8000-000000000002','enterprise','active',true,'woovi');
