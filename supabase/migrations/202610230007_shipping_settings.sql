-- Configurable shipping, used by both the storefront and the authoritative checkout RPC.
begin;
create table if not exists public.shipping_settings (
 id smallint primary key default 1 check(id = 1),
 base_cost numeric(10,2) not null default 220 check(base_cost >= 0 and base_cost <= 999999),
 free_from numeric(10,2) default 1500 check(free_from is null or (free_from >= 0 and free_from <= 999999)),
 state_rates jsonb not null default '{}'::jsonb check(jsonb_typeof(state_rates) = 'object')
);
insert into public.shipping_settings(id) values (1) on conflict (id) do nothing;
alter table public.shipping_settings enable row level security;
revoke all on public.shipping_settings from anon, authenticated;
grant select on public.shipping_settings to anon, authenticated;
drop policy if exists "Public shipping rates" on public.shipping_settings;
create policy "Public shipping rates" on public.shipping_settings for select to anon, authenticated using (true);
create or replace function public.admin_save_shipping(p_base_cost numeric, p_free_from numeric, p_state_rates jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_rate record;
begin
 if not coalesce(public.is_store_admin(), false) then raise exception 'forbidden'; end if;
 if p_base_cost is null or p_base_cost < 0 or p_base_cost > 999999 or p_base_cost != round(p_base_cost,2)
   or (p_free_from is not null and (p_free_from < 0 or p_free_from > 999999 or p_free_from != round(p_free_from,2)))
   or jsonb_typeof(p_state_rates) is distinct from 'object' then raise exception 'invalid_rates'; end if;
 if (select count(*) from jsonb_each(p_state_rates)) > 32 then raise exception 'invalid_rates'; end if;
 for v_rate in select key,value from jsonb_each(p_state_rates) loop
   if length(v_rate.key) not between 1 and 100 or jsonb_typeof(v_rate.value) != 'number' then raise exception 'invalid_rates'; end if;
   if v_rate.value::text::numeric < 0 or v_rate.value::text::numeric > 999999 or v_rate.value::text::numeric != round(v_rate.value::text::numeric,2) then raise exception 'invalid_rates'; end if;
 end loop;
 insert into public.shipping_settings(id,base_cost,free_from,state_rates) values(1,p_base_cost,p_free_from,p_state_rates)
 on conflict(id) do update set base_cost = excluded.base_cost, free_from = excluded.free_from, state_rates = excluded.state_rates;
end;
$$;
revoke all on function public.admin_save_shipping(numeric,numeric,jsonb) from public;
grant execute on function public.admin_save_shipping(numeric,numeric,jsonb) to authenticated;
create or replace function public.calculate_checkout_shipping(p_subtotal numeric, p_state text) returns numeric
language sql stable security definer set search_path = '' as $$
 select case when s.free_from is not null and p_subtotal >= s.free_from then 0 else coalesce((s.state_rates->>trim(p_state))::numeric, s.base_cost) end
 from public.shipping_settings s where s.id = 1;
$$;
revoke all on function public.calculate_checkout_shipping(numeric,text) from public;

create or replace function public.create_checkout_order(
  p_customer jsonb,
  p_address jsonb,
  p_items jsonb
)
returns table (order_number text, subtotal numeric, shipping_cost numeric, total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_product record;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(10, 2) := 0;
  v_shipping_cost numeric(10, 2);
  v_proof_token text := p_customer->>'proof_token';
begin
  if coalesce(v_proof_token, '') !~ '^[a-f0-9]{64}$' then raise exception 'invalid_proof_token'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'invalid_cart';
  end if;
  if coalesce(length(trim(p_customer->>'first_name')), 0) not between 1 and 80
     or coalesce(length(trim(p_customer->>'last_name')), 0) not between 1 and 100
     or coalesce(length(trim(p_customer->>'email')), 0) not between 5 and 254
     or trim(p_customer->>'email') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or coalesce(length(trim(p_customer->>'phone')), 0) > 30 then raise exception 'invalid_customer'; end if;
  if coalesce(length(trim(p_address->>'street')), 0) not between 1 and 120
     or coalesce(length(trim(p_address->>'exterior_number')), 0) not between 1 and 20
     or coalesce(length(trim(p_address->>'interior_number')), 0) > 20
     or coalesce(length(trim(p_address->>'neighborhood')), 0) not between 1 and 100
     or coalesce(length(trim(p_address->>'city')), 0) not between 1 and 100
     or coalesce(length(trim(p_address->>'state')), 0) not between 1 and 100
     or coalesce(trim(p_address->>'postal_code'), '') !~ '^[0-9]{5}$' then raise exception 'invalid_address'; end if;

  for v_item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    if coalesce(v_item->>'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' then raise exception 'invalid_cart_item'; end if;
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity > 99 then raise exception 'invalid_quantity'; end if;
    if (select count(*) from jsonb_array_elements(p_items) as items(value) where value->>'product_id' = v_item->>'product_id') > 1 then raise exception 'duplicate_cart_item'; end if;
    select id, name, set_name, language, price_mxn, stock, is_active into v_product from public.products where id = v_product_id for update;
    if not found then raise exception 'product_unavailable'; end if;
    if not v_product.is_active then raise exception 'product_unavailable'; end if;
    if v_quantity > v_product.stock then raise exception 'insufficient_stock'; end if;
    v_subtotal := v_subtotal + (v_product.price_mxn * v_quantity);
  end loop;

  v_shipping_cost := public.calculate_checkout_shipping(v_subtotal, p_address->>'state');
  insert into public.orders as inserted (
    user_id, status, customer_first_name, customer_last_name, customer_email, customer_phone,
    shipping_street, shipping_exterior_number, shipping_interior_number, shipping_neighborhood,
    shipping_city, shipping_state, shipping_postal_code, subtotal, shipping_cost, total
  ) values (
    v_user_id, 'pending_payment', trim(p_customer->>'first_name'), trim(p_customer->>'last_name'),
    lower(trim(p_customer->>'email')), trim(coalesce(p_customer->>'phone', '')),
    trim(p_address->>'street'), trim(p_address->>'exterior_number'), trim(coalesce(p_address->>'interior_number', '')),
    trim(p_address->>'neighborhood'), trim(p_address->>'city'), trim(p_address->>'state'), trim(p_address->>'postal_code'),
    v_subtotal, v_shipping_cost, v_subtotal + v_shipping_cost
  ) returning inserted.id, inserted.order_number into v_order_id, v_order_number;

  insert into public.order_payment_upload_tokens(order_id, token) values (v_order_id, v_proof_token);
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    select id, name, set_name, language, price_mxn into v_product from public.products where id = v_product_id;
    insert into public.order_items(order_id, product_id, product_name, set_name, language, unit_price, quantity, line_total)
      values (v_order_id, v_product.id, v_product.name, v_product.set_name, v_product.language, v_product.price_mxn, v_quantity, v_product.price_mxn * v_quantity);
    update public.products set stock = stock - v_quantity, updated_at = now() where id = v_product_id;
  end loop;
  return query select v_order_number, v_subtotal, v_shipping_cost, v_subtotal + v_shipping_cost;
end;
$$;


commit;
notify pgrst, 'reload schema';
