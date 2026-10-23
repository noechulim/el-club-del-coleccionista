-- Private payment proofs and guest-safe one-time upload capabilities.
-- Run after checkout_orders.sql and order_management.sql.

alter table public.orders add column if not exists payment_proof_path text;

create table if not exists public.order_payment_upload_tokens (
  order_id uuid primary key references public.orders(id) on delete cascade,
  token text not null
);
alter table public.order_payment_upload_tokens enable row level security;
revoke all on public.order_payment_upload_tokens from anon, authenticated, public;

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

  for v_item in select value from jsonb_array_elements(p_items) loop
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

  v_shipping_cost := case when v_subtotal >= 1500 then 0 else 220 end;
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
  for v_item in select value from jsonb_array_elements(p_items) loop
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

create or replace function public.can_upload_payment_proof(p_order_number text, p_proof_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    join public.order_payment_upload_tokens t on t.order_id = o.id
    where o.order_number = p_order_number and t.token = p_proof_token and o.status = 'pending_payment'
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
  if not public.can_upload_payment_proof(p_order_number, p_proof_token) then raise exception 'invalid_proof_access'; end if;
  if p_file_path not like p_order_number || '/' || p_proof_token || '/%' or length(p_file_path) > 300 then raise exception 'invalid_proof_path'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'payment-proofs' and name = p_file_path) then raise exception 'proof_file_missing'; end if;
  select id into v_order_id from public.orders where order_number = p_order_number and status = 'pending_payment' for update;
  if not found then raise exception 'order_not_pending'; end if;
  update public.orders set status = 'proof_submitted', payment_proof_path = p_file_path, updated_at = now() where id = v_order_id;
end;
$$;
revoke all on function public.register_payment_proof(text, text, text) from public;
grant execute on function public.register_payment_proof(text, text, text) to anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Order owners can upload payment proofs" on storage.objects;
create policy "Order owners can upload payment proofs" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'payment-proofs' and public.can_upload_payment_proof(split_part(name, '/', 1), split_part(name, '/', 2)));
drop policy if exists "Admins can read payment proofs" on storage.objects;
create policy "Admins can read payment proofs" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and (select public.is_store_admin()));
drop policy if exists "Order owners can remove failed proof uploads" on storage.objects;
create policy "Order owners can remove failed proof uploads" on storage.objects for delete to anon, authenticated
  using (bucket_id = 'payment-proofs' and public.can_upload_payment_proof(split_part(name, '/', 1), split_part(name, '/', 2)));
