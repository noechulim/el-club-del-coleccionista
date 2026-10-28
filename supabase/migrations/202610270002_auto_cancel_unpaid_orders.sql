-- Cancel unpaid orders after 24 hours and return reserved inventory.
-- Enable the pg_cron extension in Supabase before applying this migration.

alter table public.orders add column if not exists cancellation_reason text;

create or replace function public.cancel_expired_unpaid_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_cancelled integer := 0;
begin
  for v_order in
    select o.id
    from public.orders as o
    where o.status = 'pending_payment'
      and o.created_at <= now() - interval '24 hours'
    order by o.created_at
    for update skip locked
  loop
    update public.products as product
    set stock = product.stock + item.quantity,
        updated_at = now()
    from (
      select order_item.product_id, sum(order_item.quantity)::integer as quantity
      from public.order_items as order_item
      where order_item.order_id = v_order.id
        and order_item.product_id is not null
      group by order_item.product_id
    ) as item
    where product.id = item.product_id;

    update public.orders
    set status = 'cancelled', cancellation_reason = 'payment_timeout', updated_at = now()
    where id = v_order.id and status = 'pending_payment';

    if found then
      v_cancelled := v_cancelled + 1;
    end if;
  end loop;

  return v_cancelled;
end;
$$;

revoke all on function public.cancel_expired_unpaid_orders() from public, anon, authenticated;

-- A payment proof must be submitted before the same 24-hour deadline.
create or replace function public.can_upload_payment_proof(p_order_number text, p_proof_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders as o
    join public.order_payment_upload_tokens as t on t.order_id = o.id
    where o.order_number = p_order_number
      and t.token = p_proof_token
      and o.status = 'pending_payment'
      and o.created_at > now() - interval '24 hours'
  );
$$;
revoke all on function public.can_upload_payment_proof(text, text) from public;
grant execute on function public.can_upload_payment_proof(text, text) to anon, authenticated;

create or replace function public.register_payment_proof(p_order_number text, p_proof_token text, p_file_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  if not exists (
    select 1 from public.orders as o
    join public.order_payment_upload_tokens as t on t.order_id = o.id
    where o.order_number = p_order_number and t.token = p_proof_token and o.status = 'pending_payment'
  ) then raise exception 'invalid_proof_access'; end if;
  if not public.can_upload_payment_proof(p_order_number, p_proof_token) then raise exception 'payment_deadline_expired'; end if;
  if p_file_path not like p_order_number || '/' || p_proof_token || '/%' or length(p_file_path) > 300 then raise exception 'invalid_proof_path'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'payment-proofs' and name = p_file_path) then raise exception 'proof_file_missing'; end if;
  select id into v_order_id
  from public.orders
  where order_number = p_order_number
    and status = 'pending_payment'
    and created_at > now() - interval '24 hours'
  for update;
  if not found then raise exception 'payment_deadline_expired'; end if;
  update public.orders set status = 'proof_submitted', payment_proof_path = p_file_path, updated_at = now() where id = v_order_id;
end;
$$;
revoke all on function public.register_payment_proof(text, text, text) from public;
grant execute on function public.register_payment_proof(text, text, text) to anon, authenticated;

create or replace function public.lookup_guest_order(p_order_number text, p_customer_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order jsonb;
begin
  if coalesce(p_order_number, '') !~ '^ECC-[0-9]{6}-[0-9]{6}$'
     or coalesce(length(trim(p_customer_email)), 0) not between 5 and 254
     or trim(p_customer_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return null;
  end if;

  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'cancellation_reason', o.cancellation_reason,
    'total', o.total,
    'created_at', o.created_at,
    'shipping_carrier', o.shipping_carrier,
    'tracking_number', o.tracking_number,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('product_name', i.product_name, 'set_name', i.set_name, 'quantity', i.quantity) order by i.id)
      from public.order_items as i where i.order_id = o.id
    ), '[]'::jsonb)
  ) into v_order
  from public.orders as o
  where o.order_number = trim(p_order_number)
    and lower(trim(o.customer_email)) = lower(trim(p_customer_email))
    and o.user_id is null
  limit 1;
  return v_order;
end;
$$;
revoke all on function public.lookup_guest_order(text, text) from public;
grant execute on function public.lookup_guest_order(text, text) to anon, authenticated;

create or replace function public.get_order_payment_details(p_order_number text, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'cancellation_reason', o.cancellation_reason,
    'subtotal', o.subtotal,
    'shipping_cost', o.shipping_cost,
    'total', o.total,
    'shipping_carrier', o.shipping_carrier,
    'tracking_number', o.tracking_number
  )
  from public.orders as o
  join public.order_payment_upload_tokens as t on t.order_id = o.id
  where o.order_number = p_order_number and t.token = p_token and p_token ~ '^[a-f0-9]{64}$';
$$;
revoke all on function public.get_order_payment_details(text, text) from public;
grant execute on function public.get_order_payment_details(text, text) to anon, authenticated;

select cron.schedule(
  'cancel-expired-unpaid-orders',
  '* * * * *',
  'select public.cancel_expired_unpaid_orders();'
);

notify pgrst, 'reload schema';
