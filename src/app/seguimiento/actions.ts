"use server";

import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/orders";

export type GuestOrderResult = {
  order_number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  shipping_carrier: string;
  tracking_number: string;
  cancellation_reason?: string | null;
  items: { product_name: string; set_name: string; quantity: number }[];
};

export type LookupState = { error?: string; order?: GuestOrderResult };

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function lookupGuestOrder(_previous: LookupState, formData: FormData): Promise<LookupState> {
  if (!hasSupabaseConfig()) return { error: "El seguimiento no está disponible mientras se configura la tienda." };

  const orderNumber = text(formData, "orderNumber").toUpperCase();
  const email = text(formData, "email").toLowerCase();
  if (!/^ECC-[0-9]{6}-[0-9]{6}$/.test(orderNumber)) return { error: "Escribe un número de pedido válido, por ejemplo ECC-261023-000001." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Escribe el correo que usaste al realizar la compra." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("lookup_guest_order", {
    p_order_number: orderNumber,
    p_customer_email: email,
  });
  if (error) {
    return { error: error.message.toLowerCase().includes("function")
      ? "El seguimiento no está disponible por el momento. Intenta más tarde."
      : "No se pudo consultar el pedido. Inténtalo de nuevo." };
  }
  if (!data || typeof data !== "object") return { error: "No encontramos un pedido con esos datos." };

  return { order: data as GuestOrderResult };
}
