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
