-- Checkout orders. Run in Supabase Dashboard > SQL Editor after the existing migrations.

create sequence if not exists public.order_number_seq;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default (
    'ECC-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0')
  ),
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'proof_submitted', 'payment_confirmed', 'preparing', 'shipped', 'cancelled')),
  customer_first_name text not null,
  customer_last_name text not null,
  customer_email text not null,
  customer_phone text not null default '',
  shipping_street text not null,
  shipping_exterior_number text not null,
  shipping_interior_number text not null default '',
  shipping_neighborhood text not null,
  shipping_city text not null,
  shipping_state text not null,
  shipping_postal_code text not null check (shipping_postal_code ~ '^[0-9]{5}$'),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  shipping_cost numeric(10, 2) not null check (shipping_cost >= 0),
  total numeric(10, 2) not null check (total = subtotal + shipping_cost),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  set_name text not null default '',
  language text not null default 'English',
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10, 2) not null check (line_total = unit_price * quantity)
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

grant select on public.orders, public.order_items to authenticated;

drop policy if exists "Customers and admins can read orders" on public.orders;
create policy "Customers and admins can read orders"
  on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_store_admin()));

drop policy if exists "Customers and admins can read order items" on public.order_items;
create policy "Customers and admins can read order items"
  on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and (orders.user_id = (select auth.uid()) or (select public.is_store_admin()))
  ));

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
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'invalid_cart';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'invalid_cart';
  end if;

  if coalesce(length(trim(p_customer->>'first_name')), 0) not between 1 and 80
     or coalesce(length(trim(p_customer->>'last_name')), 0) not between 1 and 100
     or coalesce(length(trim(p_customer->>'email')), 0) not between 5 and 254
     or trim(p_customer->>'email') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or coalesce(length(trim(p_customer->>'phone')), 0) > 30 then
    raise exception 'invalid_customer';
  end if;

  if coalesce(length(trim(p_address->>'street')), 0) not between 1 and 120
     or coalesce(length(trim(p_address->>'exterior_number')), 0) not between 1 and 20
     or coalesce(length(trim(p_address->>'interior_number')), 0) > 20
     or coalesce(length(trim(p_address->>'neighborhood')), 0) not between 1 and 100
     or coalesce(length(trim(p_address->>'city')), 0) not between 1 and 100
     or coalesce(length(trim(p_address->>'state')), 0) not between 1 and 100
     or coalesce(trim(p_address->>'postal_code'), '') !~ '^[0-9]{5}$' then
    raise exception 'invalid_address';
  end if;

  -- Lock and validate live catalog prices and stock; browser prices are never trusted.
  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(v_item->>'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' then
      raise exception 'invalid_cart_item';
    end if;
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity > 99 then raise exception 'invalid_quantity'; end if;
    if (select count(*) from jsonb_array_elements(p_items) as items(value)
        where value->>'product_id' = v_item->>'product_id') > 1 then
      raise exception 'duplicate_cart_item';
    end if;

    select id, name, set_name, language, price_mxn, stock, is_active
      into v_product
      from public.products
      where id = v_product_id
      for update;
    if not found then raise exception 'product_unavailable'; end if;
    if not v_product.is_active then raise exception 'product_unavailable'; end if;
    if v_quantity > v_product.stock then raise exception 'insufficient_stock'; end if;
    v_subtotal := v_subtotal + (v_product.price_mxn * v_quantity);
  end loop;

  v_shipping_cost := case when v_subtotal >= 1500 then 0 else 220 end;

  insert into public.orders as inserted (
    user_id, status, customer_first_name, customer_last_name, customer_email, customer_phone,
    shipping_street, shipping_exterior_number, shipping_interior_number,
    shipping_neighborhood, shipping_city, shipping_state, shipping_postal_code,
    subtotal, shipping_cost, total
  ) values (
    v_user_id, 'pending_payment', trim(p_customer->>'first_name'), trim(p_customer->>'last_name'),
    lower(trim(p_customer->>'email')), trim(coalesce(p_customer->>'phone', '')),
    trim(p_address->>'street'), trim(p_address->>'exterior_number'), trim(coalesce(p_address->>'interior_number', '')),
    trim(p_address->>'neighborhood'), trim(p_address->>'city'), trim(p_address->>'state'), trim(p_address->>'postal_code'),
    v_subtotal, v_shipping_cost, v_subtotal + v_shipping_cost
  ) returning inserted.id, inserted.order_number into v_order_id, v_order_number;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    select id, name, set_name, language, price_mxn
      into v_product from public.products where id = v_product_id;

    insert into public.order_items (
      order_id, product_id, product_name, set_name, language, unit_price, quantity, line_total
    ) values (
      v_order_id, v_product.id, v_product.name, v_product.set_name, v_product.language,
      v_product.price_mxn, v_quantity, v_product.price_mxn * v_quantity
    );
    update public.products set stock = stock - v_quantity, updated_at = now() where id = v_product_id;
  end loop;

  return query select v_order_number, v_subtotal, v_shipping_cost, v_subtotal + v_shipping_cost;
end;
$$;

revoke all on function public.create_checkout_order(jsonb, jsonb, jsonb) from public;
grant execute on function public.create_checkout_order(jsonb, jsonb, jsonb) to anon, authenticated;
