"use server";
import { revalidatePath } from "next/cache";
import { getAdminAccess } from "@/lib/admin-access";
import { mexicanStates } from "@/lib/shipping";
type ShippingState = { error?: string; message?: string };
export async function saveShipping(_previous: ShippingState, formData: FormData): Promise<ShippingState> {
  const db = await getAdminAccess();
  if (!db) return { error: "No tienes permisos para cambiar las tarifas." };
  const baseText = String(formData.get("base") || "").trim(), freeText = String(formData.get("free") || "").trim();
  const base = Number(baseText), free = freeText ? Number(freeText) : null;
  const valid = (value: number) => Number.isFinite(value) && value >= 0 && value <= 999999 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
  if (!baseText || !valid(base) || (free !== null && !valid(free))) return { error: "Usa importes positivos con un máximo de dos decimales." };
  const rates: Record<string, number> = {};
  for (const state of mexicanStates) { const value = String(formData.get(state) || "").trim(); if (value) { if (!valid(Number(value))) return { error: `Revisa la tarifa de ${state}.` }; rates[state] = Number(value); } }
  const { error } = await db.rpc("admin_save_shipping", { p_base_cost: base, p_free_from: free, p_state_rates: rates });
  if (error) return { error: "No pudimos guardar las tarifas. Comprueba que aplicaste 202610230007_shipping_settings.sql." };
  revalidatePath("/", "layout");
  return { message: "Tarifas guardadas. Se aplicarán a pedidos nuevos." };
}
