"use server";

import { hasSupabaseConfig, createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomBytes, randomUUID } from "node:crypto";
import { sendOrderEmail } from "@/lib/order-email";

export type ProofUploadState = { error?: string; message?: string };

export type CheckoutState = {
  error?: string;
  orderNumber?: string;
  subtotal?: number;
  shippingCost?: number;
  total?: number;
  proofToken?: string;
  emailNotice?: string;
};

type CheckoutItem = { product_id: string; quantity: number };

function isCheckoutItem(item: unknown): item is CheckoutItem {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Record<string, unknown>;
  return typeof candidate.product_id === "string" && Number.isInteger(candidate.quantity);
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function placeOrder(_previous: CheckoutState, formData: FormData): Promise<CheckoutState> {
  if (!hasSupabaseConfig()) return { error: "No podemos registrar pedidos en este momento. Intenta más tarde." };

  const email = text(formData, "email").toLowerCase();
  const postalCode = text(formData, "postalCode");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Escribe un correo electrónico válido." };
  if (!/^\d{5}$/.test(postalCode)) return { error: "El código postal debe tener cinco dígitos." };

  let items: unknown;
  try {
    items = JSON.parse(text(formData, "items"));
  } catch {
    return { error: "No se pudo leer el carrito. Vuelve a cargar la página e inténtalo otra vez." };
  }
  if (!Array.isArray(items) || items.length < 1) return { error: "Tu carrito está vacío." };

  const customer = {
    first_name: text(formData, "firstName"),
    last_name: text(formData, "lastName"),
    email,
    phone: text(formData, "phone"),
    proof_token: randomBytes(32).toString("hex"),
  };
  const address = {
    street: text(formData, "street"),
    exterior_number: text(formData, "exteriorNumber"),
    interior_number: text(formData, "interiorNumber"),
    neighborhood: text(formData, "neighborhood"),
    city: text(formData, "city"),
    state: text(formData, "state"),
    postal_code: postalCode,
  };

  if (!customer.first_name || !customer.last_name || !address.street || !address.exterior_number || !address.neighborhood || !address.city || !address.state) {
    return { error: "Completa los datos de contacto y la dirección de envío." };
  }
  if (customer.first_name.length > 80 || customer.last_name.length > 100 || customer.phone.length > 30) {
    return { error: "Revisa el largo de los datos de contacto." };
  }
  if (!items.every(isCheckoutItem)) {
    return { error: "El carrito contiene un producto inválido. Vuelve a cargar la página." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_checkout_order", {
    p_customer: customer,
    p_address: address,
    p_items: items,
  });

  if (error) {
    const detail = error.message.toLowerCase();
    if (detail.includes("insufficient_stock") || detail.includes("product_unavailable")) {
      return { error: "Un producto ya no tiene suficiente existencia. Revisa tu carrito e inténtalo de nuevo." };
    }
    if (detail.includes("invalid_address")) return { error: "Revisa la dirección y el código postal." };
    if (detail.includes("invalid_customer")) return { error: "Revisa tu nombre, apellido, correo y teléfono." };
    if (detail.includes("function") && detail.includes("does not exist")) {
      return { error: "El registro de pedidos no está disponible por el momento." };
    }
    return { error: "No se pudo registrar el pedido. Revisa tus datos e inténtalo de nuevo." };
  }

  const order = Array.isArray(data) ? data[0] : data;
  if (!order?.order_number) return { error: "Supabase no devolvió la confirmación del pedido." };

  const emailResult = await sendOrderEmail({
    to: customer.email,
    firstName: customer.first_name,
    orderNumber: String(order.order_number),
    status: "pending_payment",
    kind: "confirmation",
    proofToken: customer.proof_token,
  });

  return {
    orderNumber: String(order.order_number),
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shipping_cost),
    total: Number(order.total),
    proofToken: customer.proof_token,
    emailNotice: emailResult === "sent"
      ? "Enviamos la confirmación a tu correo."
      : emailResult === "not_configured"
        ? "El pedido quedó registrado. Conserva tu número y el enlace privado para consultar el pago y seguimiento."
        : "El pedido quedó registrado, pero no pudimos enviar el correo. Conserva tu número de pedido.",
  };
}

export async function uploadPaymentProof(_previous: ProofUploadState, formData: FormData): Promise<ProofUploadState> {
  if (!hasSupabaseConfig()) return { error: "El servicio no está disponible por el momento." };
  const orderNumber = text(formData, "orderNumber");
  const proofToken = text(formData, "proofToken");
  const file = formData.get("proof");
  if (!/^ECC-[0-9]{6}-[0-9]{6}$/.test(orderNumber) || !/^[a-f0-9]{64}$/.test(proofToken)) {
    return { error: "No se pudo validar el acceso al pedido. Conserva su número y vuelve a cargar la página." };
  }
  if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024) return { error: "Selecciona un comprobante de máximo 5 MB." };
  const extensions: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension) return { error: "El comprobante debe ser PDF, JPG, PNG o WebP." };

  const supabase = await createSupabaseServerClient();
  const path = `${orderNumber}/${proofToken}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
  if (uploadError) return { error: "No se pudo subir el comprobante. Conserva tu número de pedido e intenta más tarde." };

  const { error } = await supabase.rpc("register_payment_proof", { p_order_number: orderNumber, p_proof_token: proofToken, p_file_path: path });
  if (error) {
    await supabase.storage.from("payment-proofs").remove([path]);
    return { error: "No se pudo asociar el comprobante. El pedido podría haber cambiado de estado." };
  }
  revalidatePath("/cuenta");
  revalidatePath(`/pedido/${orderNumber}`);
  revalidatePath("/admin/orders");
  return { message: "Comprobante enviado. El pedido ahora está pendiente de revisión." };
}
