-- Fails fast with ON_ERROR_STOP=1. Synthetic users only.
-- IMPORTANT: all settlement assertions run as the actual service_role, NOT a superuser.
begin;
set local role service_role;
do $t$
declare
  u uuid := '11111111-1111-4111-8111-111111111111';
  other_u uuid := '22222222-2222-4222-8222-222222222222';
  e timestamptz;
  e2 timestamptz;
  result jsonb;
  caught boolean;
begin
  if has_function_privilege('authenticated','public.nexjud_settle_paid_order(text,jsonb)','EXECUTE')
     or has_function_privilege('anon','public.nexjud_settle_paid_order(text,jsonb)','EXECUTE') then
     raise exception 'SECURITY: client can invoke billing settlement';
  end if;
  if not has_function_privilege('service_role','public.nexjud_settle_paid_order(text,jsonb)','EXECUTE') then
     raise exception 'service_role cannot settle';
  end if;
  insert into public.payment_orders(user_id,plan,amount_cents,correlation_id) values
    (u,'pro',19700,'synthetic-first'),
    (u,'pro',19700,'synthetic-renewal'),
    (u,'enterprise',79700,'synthetic-upgrade'),
    (u,'pro',19700,'synthetic-downgrade'),
    (other_u,'pro',19700,'synthetic-other'),
    (u,'intelligence',19700,'synthetic-wrong-amount'),
    (u,'pro',19700,'synthetic-refund');
  update public.payment_orders set status='refunded' where correlation_id='synthetic-refund';
  result:=public.nexjud_settle_paid_order('synthetic-first','{"test":true}');
  if result->>'paid' <> 'true' or result->>'duplicate' <> 'false' then
    raise exception 'first payment not settled';
  end if;
  select current_period_end into e from public.subscriptions where user_id=u;
  if e <= now() + interval '27 days' or e >= now() + interval '32 days' then
    raise exception 'wrong first paid period';
  end if;
  result:=public.nexjud_settle_paid_order('synthetic-first','{}');
  if result->>'duplicate'<>'true' then raise exception 'duplicate not detected'; end if;
  if (select current_period_end from public.subscriptions where user_id=u)<>e then
    raise exception 'duplicate double-extended period';
  end if;
  perform public.nexjud_settle_paid_order('synthetic-renewal','{}');
  select current_period_end into e2 from public.subscriptions where user_id=u;
  if e2<>e+interval '1 month' then raise exception 'renewal did not extend period'; end if;
  caught:=false;
  begin
    perform public.nexjud_settle_paid_order('synthetic-wrong-amount','{}');
  exception when others then
    caught:=(SQLERRM='payment_amount_mismatch');
  end;
  if not caught or (select status from public.payment_orders where correlation_id='synthetic-wrong-amount')<>'pending' then
    raise exception 'mismatched charge was settled or wrong error';
  end if;
  caught:=false;
  begin
    perform public.nexjud_settle_paid_order('synthetic-refund','{}');
  exception when others then
    caught:=(SQLERRM='payment_order_not_pending');
  end;
  if not caught then raise exception 'refunded charge treated as paid'; end if;
  perform public.nexjud_settle_paid_order('synthetic-upgrade','{}');
  if (select plan from public.subscriptions where user_id=u)<>'enterprise' then
    raise exception 'upgrade not applied';
  end if;
  caught:=false;
  begin perform public.nexjud_settle_paid_order('synthetic-downgrade','{}');
  exception when others then caught:=(SQLERRM='manual_plan_downgrade_reconciliation_required');
  end;
  if not caught or (select status from public.payment_orders where correlation_id='synthetic-downgrade')<>'pending' then
    raise exception 'downgrade not protected';
  end if;
  perform public.nexjud_settle_paid_order('synthetic-other','{}');
  if (select count(*) from public.subscriptions where status='active')<>2 then
    raise exception 'cross-user contamination';
  end if;
end
$t$;
commit;
-- RLS: the first user must not read another user's orders or subscription.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $t$
begin
  if (select count(*) from public.subscriptions)<>1 then raise exception 'RLS subscription leak'; end if;
  if (select count(*) from public.payment_orders where user_id='22222222-2222-4222-8222-222222222222')<>0 then
    raise exception 'RLS order leak';
  end if;
  begin
    perform public.nexjud_settle_paid_order('synthetic-other','{}');
    raise exception 'SECURITY: authenticated client executed settlement RPC';
  exception
    when insufficient_privilege then null;
  end;
end $t$;
rollback;
