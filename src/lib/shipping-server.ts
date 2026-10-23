import "server-only";
import { createPublicSupabaseClient } from "./products-server";
import { defaultShipping, type ShippingConfig } from "./shipping";
export async function getShippingConfig(): Promise<ShippingConfig> {
  const db = createPublicSupabaseClient();
  if (!db) return defaultShipping;
  const { data, error } = await db.from("shipping_settings").select("base_cost, free_from, state_rates").eq("id", 1).maybeSingle();
  if (error || !data) return defaultShipping;
  return { base_cost: Number(data.base_cost), free_from: data.free_from === null ? null : Number(data.free_from), state_rates: data.state_rates || {} };
}
