-- Enforce the order workflow in the database, including direct RPC calls.
create index if not exists orders_pending_payment_created_idx
  on public.orders (created_at) where status = 'pending_payment';

create or replace function public.admin_update_order(
  p_order_id uuid,
  p_status text,
  p_shipping_carrier text default '',
  p_tracking_number text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if not coalesce(public.is_store_admin(), false) then raise exception 'not_admin'; end if;
  if p_status is null or p_status not in ('pending_payment', 'proof_submitted', 'payment_confirmed', 'preparing', 'shipped', 'cancelled') then
    raise exception 'invalid_status';
  end if;
  if length(coalesce(p_shipping_carrier, '')) > 100 or length(coalesce(p_tracking_number, '')) > 120 then
    raise exception 'invalid_tracking';
  end if;
  if p_status = 'shipped' and length(trim(coalesce(p_tracking_number, ''))) = 0 then
    raise exception 'tracking_required';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  if p_status <> v_order.status and not (
    (v_order.status = 'pending_payment' and p_status in ('payment_confirmed', 'cancelled')) or
    (v_order.status = 'proof_submitted' and p_status in ('payment_confirmed', 'pending_payment', 'cancelled')) or
    (v_order.status = 'payment_confirmed' and p_status in ('preparing', 'cancelled')) or
    (v_order.status = 'preparing' and p_status in ('shipped', 'cancelled'))
  ) then
    raise exception 'invalid_order_transition';
  end if;

  if p_status = 'cancelled' and v_order.status <> 'cancelled' then
    update public.products as product
    set stock = product.stock + item.quantity, updated_at = now()
    from (
      select order_item.product_id, sum(order_item.quantity)::integer as quantity
      from public.order_items as order_item
      where order_item.order_id = v_order.id and order_item.product_id is not null
      group by order_item.product_id
    ) as item
    where product.id = item.product_id;
  end if;

  update public.orders
  set status = p_status,
      payment_proof_path = case
        when v_order.status = 'proof_submitted' and p_status = 'pending_payment' then null
        else payment_proof_path
      end,
      shipping_carrier = trim(coalesce(p_shipping_carrier, '')),
      tracking_number = trim(coalesce(p_tracking_number, '')),
      updated_at = now()
  where id = p_order_id;
end;
$$;

revoke all on function public.admin_update_order(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_order(uuid, text, text, text) to authenticated;
