-- Apply after 202610230007_shipping_settings.sql. Also corrects
-- 202610290001_fixed_state_shipping.sql if that migration was run already.
begin;

drop function if exists public.admin_save_state_shipping(jsonb);
drop function if exists public.admin_save_shipping(numeric, numeric, jsonb);

-- Preserve the settings table for compatibility, but remove state-specific rates.
update public.shipping_settings
set base_cost = 220, free_from = 1500, state_rates = '{}'::jsonb
where id = 1;

create or replace function public.calculate_checkout_shipping(p_subtotal numeric, p_state text)
returns numeric
language sql stable security definer set search_path = '' as $$
  select case when p_subtotal >= 1500 then 0::numeric else 220::numeric end;
$$;
revoke all on function public.calculate_checkout_shipping(numeric, text) from public;

commit;
notify pgrst, 'reload schema';
