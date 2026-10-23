"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/orders";
import { sendOrderEmail } from "@/lib/order-email";

export type OrderActionState = { error?: string; message?: string; warning?: string };
const statuses: OrderStatus[] = ["pending_payment", "proof_submitted", "payment_confirmed", "preparing", "shipped", "cancelled"];

export async function updateOrder(_previous: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para continuar." };
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_store_admin");
  if (adminError || !isAdmin) return { error: "Tu cuenta no tiene permisos de administración." };

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  const carrier = String(formData.get("carrier") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !statuses.includes(status)) return { error: "Los datos del pedido no son válidos." };
  if (carrier.length > 100 || trackingNumber.length > 120) return { error: "La paquetería o la guía excede el límite permitido." };
  if (status === "shipped" && !trackingNumber) return { error: "Agrega el número de guía antes de marcar el pedido como enviado." };

  const { data: order, error: orderError } = await supabase.from("orders")
    .select("user_id, order_number, status, customer_email, customer_first_name, shipping_carrier, tracking_number")
    .eq("id", id)
    .maybeSingle();
  if (orderError || !order) return { error: "No se encontró el pedido para actualizar." };

  const { error } = await supabase.rpc("admin_update_order", {
    p_order_id: id,
    p_status: status,
    p_shipping_carrier: carrier,
    p_tracking_number: trackingNumber,
  });
  if (error) {
    return { error: error.message.includes("preorders_not_ready") ? "Confirma primero que llegaron todos los productos de preventa." : error.message.includes("terminal_order_status")
      ? "Un pedido cancelado o enviado no puede regresar a otro estado."
      : error.message.includes("tracking_required")
        ? "Agrega el número de guía antes de marcar el pedido como enviado."
        : "No se pudo actualizar el pedido. Verifica que aplicaste la migración de administración de pedidos." };
  }
  revalidatePath("/admin/orders");
  revalidatePath("/cuenta");
  const shouldNotify = order.status !== status || (status === "shipped" && (order.shipping_carrier !== carrier || order.tracking_number !== trackingNumber));
  if (!shouldNotify) return { message: "Pedido actualizado. No hubo cambios en el estado ni en los datos de envío." };

  const emailResult = await sendOrderEmail({
    to: order.customer_email,
    firstName: order.customer_first_name,
    orderNumber: order.order_number,
    status,
    carrier,
    trackingNumber,
    kind: "status",
    accountOrder: Boolean(order.user_id),
  });
  if (emailResult === "not_configured") return { message: "Pedido actualizado.", warning: "No se envió el correo: configura RESEND_API_KEY y ORDER_EMAIL_FROM." };
  if (emailResult === "failed") return { message: "Pedido actualizado.", warning: "No se pudo enviar el correo. El pedido sí quedó actualizado; revisa la configuración del proveedor." };
  return { message: "Pedido actualizado y aviso enviado al cliente." };
}

export async function releasePreorder(_previous: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_release_preorder", { p_order_id: String(formData.get("id") || "") });
  if (error) return { error: "No se pudo liberar la preventa. Revisa tus permisos y el estado del pedido." };
  revalidatePath("/admin/orders"); revalidatePath("/cuenta");
  return { message: "Unidades recibidas. Ya puedes preparar y enviar el pedido." };
}
