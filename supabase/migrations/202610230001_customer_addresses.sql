-- Saved shipping addresses for signed-in customers.

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'Casa' check (length(trim(label)) between 1 and 40),
  recipient_name text not null check (length(trim(recipient_name)) between 1 and 120),
  phone text not null default '' check (length(phone) <= 30),
  street text not null check (length(trim(street)) between 1 and 120),
  exterior_number text not null check (length(trim(exterior_number)) between 1 and 20),
  interior_number text not null default '' check (length(interior_number) <= 20),
  neighborhood text not null check (length(trim(neighborhood)) between 1 and 100),
  city text not null check (length(trim(city)) between 1 and 100),
  state text not null check (length(trim(state)) between 1 and 100),
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_user_idx
  on public.customer_addresses (user_id, created_at desc);

create unique index if not exists customer_addresses_one_default_per_user_idx
  on public.customer_addresses (user_id)
  where is_default;

alter table public.customer_addresses enable row level security;
grant select on public.customer_addresses to authenticated;

drop policy if exists "Users can read own addresses" on public.customer_addresses;
create policy "Users can read own addresses"
  on public.customer_addresses for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.save_customer_address(p_id uuid, p_address jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_default boolean := coalesce((p_address->>'is_default')::boolean, false);
  v_address_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if coalesce(length(trim(p_address->>'label')), 0) not between 1 and 40
     or coalesce(length(trim(p_address->>'recipient_name')), 0) not between 1 and 120
     or coalesce(length(p_address->>'phone'), 0) > 30
     or coalesce(length(trim(p_address->>'street')), 0) not between 1 and 120
     or coalesce(length(trim(p_address->>'exterior_number')), 0) not between 1 and 20
     or coalesce(length(p_address->>'interior_number'), 0) > 20
     or coalesce(length(trim(p_address->>'neighborhood')), 0) not between 1 and 100
     or coalesce(length(trim(p_address->>'city')), 0) not between 1 and 100
     or coalesce(length(trim(p_address->>'state')), 0) not between 1 and 100
     or coalesce(trim(p_address->>'postal_code'), '') !~ '^[0-9]{5}$' then
    raise exception 'invalid_address';
  end if;

  if p_id is not null and not exists (
    select 1 from public.customer_addresses where id = p_id and user_id = v_user_id
  ) then
    raise exception 'address_not_found';
  end if;

  if p_id is null and not exists (
    select 1 from public.customer_addresses where user_id = v_user_id
  ) then
    v_is_default := true;
  end if;

  if v_is_default then
    update public.customer_addresses
      set is_default = false, updated_at = now()
      where user_id = v_user_id and id is distinct from p_id and is_default;
  end if;

  if p_id is null then
    insert into public.customer_addresses (
      user_id, label, recipient_name, phone, street, exterior_number,
      interior_number, neighborhood, city, state, postal_code, is_default
    ) values (
      v_user_id, trim(p_address->>'label'), trim(p_address->>'recipient_name'), trim(coalesce(p_address->>'phone', '')),
      trim(p_address->>'street'), trim(p_address->>'exterior_number'), trim(coalesce(p_address->>'interior_number', '')),
      trim(p_address->>'neighborhood'), trim(p_address->>'city'), trim(p_address->>'state'), trim(p_address->>'postal_code'), v_is_default
    ) returning id into v_address_id;
  else
    update public.customer_addresses
      set label = trim(p_address->>'label'),
          recipient_name = trim(p_address->>'recipient_name'),
          phone = trim(coalesce(p_address->>'phone', '')),
          street = trim(p_address->>'street'),
          exterior_number = trim(p_address->>'exterior_number'),
          interior_number = trim(coalesce(p_address->>'interior_number', '')),
          neighborhood = trim(p_address->>'neighborhood'),
          city = trim(p_address->>'city'),
          state = trim(p_address->>'state'),
          postal_code = trim(p_address->>'postal_code'),
          is_default = v_is_default,
          updated_at = now()
      where id = p_id and user_id = v_user_id
      returning id into v_address_id;
  end if;

  return v_address_id;
end;
$$;

create or replace function public.delete_customer_address(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_was_default boolean;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  delete from public.customer_addresses
    where id = p_id and user_id = v_user_id
    returning is_default into v_was_default;
  if not found then raise exception 'address_not_found'; end if;

  if v_was_default then
    update public.customer_addresses
      set is_default = true, updated_at = now()
      where id = (
        select id from public.customer_addresses
        where user_id = v_user_id
        order by created_at asc
        limit 1
      );
  end if;
end;
$$;

revoke all on function public.save_customer_address(uuid, jsonb) from public, anon;
revoke all on function public.delete_customer_address(uuid) from public, anon;
grant execute on function public.save_customer_address(uuid, jsonb) to authenticated;
grant execute on function public.delete_customer_address(uuid) to authenticated;

notify pgrst, 'reload schema';
