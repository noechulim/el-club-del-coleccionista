-- Run in Supabase Dashboard > SQL Editor after create_profiles.sql.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Keep account holders from promoting themselves to store administrators.
revoke insert, update on table public.profiles from authenticated;
grant insert (id, first_name, last_name, updated_at) on public.profiles to authenticated;
grant update (id, first_name, last_name, updated_at) on public.profiles to authenticated;

create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_admin = true
  );
$$;

revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to authenticated;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('sealed', 'single', 'graded', 'accessory')),
  set_name text not null default '',
  description text not null default '',
  language text not null default 'English' check (language = 'English'),
  price_mxn numeric(10, 2) not null check (price_mxn >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text not null default '/pokemon-card.jpg',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products"
  on public.products for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can view all products" on public.products;
create policy "Admins can view all products"
  on public.products for select to authenticated
  using ((select public.is_store_admin()));

drop policy if exists "Admins can add products" on public.products;
create policy "Admins can add products"
  on public.products for insert to authenticated
  with check ((select public.is_store_admin()));

drop policy if exists "Admins can edit products" on public.products;
create policy "Admins can edit products"
  on public.products for update to authenticated
  using ((select public.is_store_admin()))
  with check ((select public.is_store_admin()));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete to authenticated
  using ((select public.is_store_admin()));

insert into public.products (slug, name, category, set_name, description, price_mxn, stock, is_active)
values
  ('producto-prueba-booster-box', '[Prueba] Booster Box', 'sealed', 'Expansiones Pokémon TCG', 'Producto de ejemplo para revisar el catálogo.', 1200, 5, false),
  ('producto-prueba-carta-suelta', '[Prueba] Carta individual', 'single', 'Singles · English', 'Carta de ejemplo para configurar nombre, precio y existencia.', 250, 1, false),
  ('producto-prueba-carta-calificada', '[Prueba] Carta calificada', 'graded', 'Cartas certificadas', 'Ejemplo de pieza calificada para configurar en el panel.', 3500, 1, false)
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view product images" on storage.objects;
create policy "Anyone can view product images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_store_admin()));

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_store_admin()))
  with check (bucket_id = 'product-images' and (select public.is_store_admin()));

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_store_admin()));
