-- Allow signed-in customers to resume proof submission from their account orders.
-- Run after 202610200003_payment_proofs.sql.

create or replace function public.get_own_pending_payment_proofs()
returns table (order_id uuid, upload_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  -- Existing pending orders from before proof uploads were enabled also get a private upload capability.
  for v_order_id in
    select o.id from public.orders o
    where o.user_id = (select auth.uid()) and o.status = 'pending_payment'
  loop
    insert into public.order_payment_upload_tokens(order_id, token)
    values (v_order_id, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
    on conflict on constraint order_payment_upload_tokens_pkey do nothing;
  end loop;

  return query
    select o.id, t.token
    from public.orders o
    join public.order_payment_upload_tokens t on t.order_id = o.id
    where o.user_id = (select auth.uid()) and o.status = 'pending_payment';
end;
$$;

revoke all on function public.get_own_pending_payment_proofs() from public, anon;
grant execute on function public.get_own_pending_payment_proofs() to authenticated;

notify pgrst, 'reload schema';
