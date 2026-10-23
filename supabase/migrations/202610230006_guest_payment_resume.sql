-- Private capability link: order number + high-entropy token, never email alone.
create or replace function public.get_order_payment_details(p_order_number text, p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('order_number', o.order_number, 'status', o.status,
    'subtotal', o.subtotal, 'shipping_cost', o.shipping_cost, 'total', o.total,
    'contains_preorder', o.contains_preorder, 'preorders_ready', o.preorders_ready,
    'shipping_carrier', o.shipping_carrier, 'tracking_number', o.tracking_number)
  from public.orders o join public.order_payment_upload_tokens t on t.order_id = o.id
  where o.order_number = p_order_number and t.token = p_token and p_token ~ '^[a-f0-9]{64}$';
$$;
revoke all on function public.get_order_payment_details(text,text) from public;
grant execute on function public.get_order_payment_details(text,text) to anon, authenticated;
notify pgrst, 'reload schema';
