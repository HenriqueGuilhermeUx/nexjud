-- NexJud paid-month prototype; **review-only**, applied in disposable PostgreSQL CI.
-- This is NOT an auto-deployed production migration. No copied customer data.
alter table public.subscriptions add column if not exists current_period_start timestamptz;
alter table public.subscriptions add column if not exists current_period_end timestamptz;

create or replace function public.nexjud_settle_paid_order(
  p_correlation_id text,
  p_payment_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $billing$
declare
  v_order public.payment_orders%rowtype;
  v_sub public.subscriptions%rowtype;
  v_now timestamptz := transaction_timestamp();
  v_begin timestamptz;
  v_end timestamptz;
  v_expected integer;
  v_rank_old integer;
  v_rank_new integer;
begin
  if length(coalesce(p_correlation_id, '')) < 4 or length(p_correlation_id) > 128 then
    raise exception 'invalid_correlation_id';
  end if;
  select * into v_order from public.payment_orders
  where correlation_id = p_correlation_id for update;
  if not found then raise exception 'payment_order_not_found'; end if;
  if v_order.provider <> 'woovi' or v_order.plan not in ('pro','intelligence','enterprise','enterprise_plus') then
    raise exception 'invalid_payment_order';
  end if;
  v_expected := case v_order.plan
    when 'pro' then 19700
    when 'intelligence' then 39700
    when 'enterprise' then 79700
    when 'enterprise_plus' then 149700
    else -1 end;
  if v_order.amount_cents <> v_expected then raise exception 'payment_amount_mismatch'; end if;

  if v_order.status = 'paid' then
    return jsonb_build_object('paid',true,'duplicate',true);
  end if;
  if v_order.status <> 'pending' then raise exception 'payment_order_not_pending'; end if;

  -- Serializes different paid orders for the same user and avoids lost monthly extensions.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_order.user_id::text, 773)
  );
  select * into v_sub from public.subscriptions
    where user_id = v_order.user_id for update;

  v_rank_old := case v_sub.plan
    when 'pro' then 1 when 'intelligence' then 2
    when 'enterprise' then 3 when 'enterprise_plus' then 4 else 0 end;
  v_rank_new := case v_order.plan
    when 'pro' then 1 when 'intelligence' then 2
    when 'enterprise' then 3 when 'enterprise_plus' then 4 else 0 end;

  -- An active paid legacy entitlement without a recorded expiry may be
  -- contractual/perpetual. Never replace it implicitly with a paid month.
  -- Combined with the Edge checkout guard, this is defence in depth for
  -- orders issued before the checkout protection was deployed.
  if v_sub.active is true and v_sub.status = 'active'
     and v_rank_old > 0 and v_sub.current_period_end is null then
    raise exception 'legacy_paid_subscription_reconciliation_required';
  end if;

  if v_sub.active is true and v_sub.status = 'active'
     and v_sub.current_period_end > v_now and v_rank_old > v_rank_new then
    -- A lower plan paid while higher tier is active requires an explicit
    -- scheduled downgrade or refund, never an implicit loss of customer access.
    raise exception 'manual_plan_downgrade_reconciliation_required';
  end if;

  v_begin := case
    when v_sub.active is true and v_sub.status='active'
       and v_sub.plan=v_order.plan and v_sub.current_period_end > v_now
      then v_sub.current_period_end
    else v_now
    end;
  v_end := v_begin + interval '1 month';

  insert into public.subscriptions (
    user_id, plan, plan_type, status, active, current_period_start,
    current_period_end, payment_provider, provider_subscription_id, updated_at
  ) values (
    v_order.user_id, v_order.plan, v_order.plan, 'active', true, v_begin,
    v_end, 'woovi', p_correlation_id, v_now
  )
  on conflict (user_id) do update set
    plan = excluded.plan, plan_type=excluded.plan_type, status='active',
    active=true, current_period_start=excluded.current_period_start,
    current_period_end=excluded.current_period_end,
    payment_provider='woovi', provider_subscription_id=p_correlation_id,
    updated_at=v_now;

  update public.payment_orders
    set status='paid', paid_at=v_now, raw=coalesce(p_payment_metadata, '{}'::jsonb)
    where id=v_order.id;

  return jsonb_build_object('paid',true,'duplicate',false,'current_period_end',v_end);
end;
$billing$;

-- Execution must be restricted even though the function is SECURITY INVOKER.
revoke all on function public.nexjud_settle_paid_order(text,jsonb)
  from public, anon, authenticated;
grant execute on function public.nexjud_settle_paid_order(text,jsonb) to service_role;
