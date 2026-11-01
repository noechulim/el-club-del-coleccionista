-- Una oferta requiere selección editorial y un precio anterior superior al actual.
alter table public.products
  add column if not exists is_offer boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_offer_requires_discount'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_offer_requires_discount
      check (not is_offer or (compare_at_price_mxn is not null and compare_at_price_mxn > price_mxn));
  end if;
end;
$$;
