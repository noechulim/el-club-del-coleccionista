-- Order status management and shipping tracking. Run after 202610200001_checkout_orders.sql.
alter table public.orders
  add column if not exists shipping_carrier text not null default '',
  add column if not exists tracking_number text not null default '';

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
  v_allowed text[] := array['pending_payment', 'proof_submitted', 'payment_confirmed', 'preparing', 'shipped', 'cancelled'];
begin
  if not coalesce(public.is_store_admin(), false) then
    raise exception 'not_admin';
  end if;
  if p_status is null or not (p_status = any(v_allowed)) then
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
  if v_order.status in ('cancelled', 'shipped') and p_status <> v_order.status then
    raise exception 'terminal_order_status';
  end if;

  if p_status = 'cancelled' and v_order.status <> 'cancelled' then
    update public.products as product
      set stock = product.stock + item.quantity, updated_at = now()
      from public.order_items as item
      where item.order_id = v_order.id and item.product_id = product.id;
  end if;

  update public.orders
    set status = p_status,
        shipping_carrier = trim(coalesce(p_shipping_carrier, '')),
        tracking_number = trim(coalesce(p_tracking_number, '')),
        updated_at = now()
    where id = p_order_id;
end;
$$;

revoke all on function public.admin_update_order(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_order(uuid, text, text, text) to authenticated;
