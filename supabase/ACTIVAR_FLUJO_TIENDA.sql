-- ACTIVAR FLUJO DE TIENDA
-- Requiere las migraciones anteriores hasta 202610230002_guest_order_lookup.sql.
-- Generado a partir de las migraciones 003 a 007; ejecutar en Supabase SQL Editor.

-- Fuente: 202610230003_catalog_filters.sql
-- Optional catalog data for discounted and preorder products.
alter table public.products
  add column if not exists compare_at_price_mxn numeric(10, 2) check (compare_at_price_mxn is null or compare_at_price_mxn >= 0),
  add column if not exists is_preorder boolean not null default false,
  add column if not exists preorder_release_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_compare_price_above_current'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_compare_price_above_current
      check (compare_at_price_mxn is null or compare_at_price_mxn > price_mxn);
  end if;
end;
$$;


-- Fuente: 202610230004_storefront_flow.sql
-- Apply after 202610230003_catalog_filters.sql.
begin;
alter table public.products
  add column if not exists product_type text not null default '',
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists specifications text not null default '',
  add column if not exists is_featured boolean not null default false;
alter table public.products drop constraint if exists products_format_valid;
alter table public.products add constraint products_format_valid check (
  product_type = '' or (category = 'sealed' and product_type in ('booster-box','elite-trainer-box','booster-bundle','collection-box','blister-pack','booster-pack','special-collection'))
);
alter table public.products drop constraint if exists products_gallery_limit;
alter table public.products add constraint products_gallery_limit check (cardinality(image_urls) <= 8);

-- Store the promised preorder information with the order, even if the product changes later.
alter table public.order_items add column if not exists is_preorder boolean not null default false;
alter table public.order_items add column if not exists preorder_release_date date;
alter table public.orders add column if not exists contains_preorder boolean not null default false;
alter table public.orders add column if not exists preorders_ready boolean not null default false;
create or replace function public.snapshot_product_preorder() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select p.is_preorder, p.preorder_release_date into new.is_preorder, new.preorder_release_date
  from public.products p where p.id = new.product_id;
  new.is_preorder := coalesce(new.is_preorder, false);
  if new.is_preorder then update public.orders set contains_preorder = true where id = new.order_id; end if;
  return new;
end;
$$;
drop trigger if exists snapshot_product_preorder on public.order_items;
create trigger snapshot_product_preorder before insert on public.order_items for each row execute function public.snapshot_product_preorder();
create or replace function public.guard_preorder_dispatch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status in ('preparing', 'shipped') and new.contains_preorder and not new.preorders_ready then
    raise exception 'preorders_not_ready';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_preorder_dispatch on public.orders;
create trigger guard_preorder_dispatch before update of status on public.orders for each row execute function public.guard_preorder_dispatch();
create or replace function public.admin_release_preorder(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.is_store_admin(), false) then raise exception 'forbidden'; end if;
  update public.orders set preorders_ready = true, updated_at = now()
  where id = p_order_id and contains_preorder and status not in ('cancelled','shipped');
  if not found then raise exception 'order_unavailable'; end if;
end;
$$;
revoke all on function public.admin_release_preorder(uuid) from public;
grant execute on function public.admin_release_preorder(uuid) to authenticated;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 1 and 100),
  email text not null check(length(email) between 5 and 254),
  subject text not null check(length(subject) between 1 and 120),
  order_number text not null default '' check(length(order_number) <= 40),
  message text not null check(length(message) between 10 and 4000),
  status text not null default 'new' check(status in ('new','in_progress','resolved')),
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_email_created on public.contact_messages(email, created_at desc);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
grant select on public.contact_messages to authenticated;
grant update(status) on public.contact_messages to authenticated;
drop policy if exists "Admins read contact messages" on public.contact_messages;
create policy "Admins read contact messages" on public.contact_messages for select to authenticated using ((select public.is_store_admin()));
drop policy if exists "Admins manage contact messages" on public.contact_messages;
create policy "Admins manage contact messages" on public.contact_messages for update to authenticated using ((select public.is_store_admin())) with check ((select public.is_store_admin()));
create or replace function public.submit_contact_message(p_name text, p_email text, p_subject text, p_order_number text, p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  if coalesce(v_email, '') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or coalesce(length(v_email),0) not between 5 and 254
    or coalesce(length(trim(p_name)),0) not between 1 and 100
    or coalesce(length(trim(p_subject)),0) not between 1 and 120
    or coalesce(length(trim(p_message)),0) not between 10 and 4000
    or coalesce(length(p_order_number),0) > 40 then raise exception 'invalid_message'; end if;
  -- Serialize per address to prevent bypass via simultaneous submissions.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0));
  if (select count(*) from public.contact_messages where email = v_email and created_at > now() - interval '1 hour') >= 3 then raise exception 'rate_limit'; end if;
  insert into public.contact_messages(name,email,subject,order_number,message) values(trim(p_name),v_email,trim(p_subject),trim(coalesce(p_order_number,'')),trim(p_message)) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_contact_message(text,text,text,text,text) from public;
grant execute on function public.submit_contact_message(text,text,text,text,text) to anon, authenticated;
commit;
notify pgrst, 'reload schema';


-- Fuente: 202610230005_preorder_tracking.sql
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


-- Fuente: 202610230006_guest_payment_resume.sql
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


-- Fuente: 202610230007_shipping_settings.sql
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
