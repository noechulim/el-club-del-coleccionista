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
