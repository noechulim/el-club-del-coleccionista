-- Remove preorder behavior while keeping legacy columns for historical orders.
begin;

drop trigger if exists guard_preorder_dispatch on public.orders;
drop trigger if exists snapshot_product_preorder on public.order_items;

drop function if exists public.guard_preorder_dispatch();
drop function if exists public.snapshot_product_preorder();
drop function if exists public.admin_release_preorder(uuid);

-- Previous preorder quantities represented reservable slots, not physical stock.
-- Keep those products in the catalog but mark them unavailable until they are stocked.
update public.products
set is_preorder = false,
    preorder_release_date = null,
    stock = 0,
    updated_at = now()
where is_preorder = true;

commit;
notify pgrst, 'reload schema';
