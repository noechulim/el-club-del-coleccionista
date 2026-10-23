-- Allow guest customers to check an order with its number and checkout email.
-- The function returns fulfillment details only; it never returns contact or address data.

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
    'contains_preorder', o.contains_preorder,
    'preorders_ready', o.preorders_ready,
    'total', o.total,
    'created_at', o.created_at,
    'shipping_carrier', o.shipping_carrier,
    'tracking_number', o.tracking_number,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'set_name', i.set_name,
        'quantity', i.quantity,
        'is_preorder', i.is_preorder,
        'preorder_release_date', i.preorder_release_date
      ) order by i.id)
      from public.order_items i
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  into v_order
  from public.orders o
  where o.order_number = trim(p_order_number)
    and lower(trim(o.customer_email)) = lower(trim(p_customer_email))
    and o.user_id is null
  limit 1;

  return v_order;
end;
$$;

revoke all on function public.lookup_guest_order(text, text) from public;
grant execute on function public.lookup_guest_order(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
