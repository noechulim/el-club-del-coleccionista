import "server-only";
import { orderStatusLabels, type OrderStatus } from "@/lib/orders";

type OrderEmailInput = {
  to: string;
  firstName: string;
  orderNumber: string;
  status: OrderStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  kind?: "confirmation" | "status";
  proofToken?: string;
  accountOrder?: boolean;
};

export type OrderEmailResult = "sent" | "not_configured" | "failed";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export async function sendOrderEmail(input: OrderEmailInput): Promise<OrderEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  if (!apiKey || !from) return "not_configured";

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const shipped = input.status === "shipped";
  const orderUrl = input.proofToken ? `${siteUrl}/pedido/${encodeURIComponent(input.orderNumber)}?token=${encodeURIComponent(input.proofToken)}` : `${siteUrl}/${input.accountOrder ? "cuenta" : "seguimiento"}`;
  const subject = input.kind === "confirmation"
    ? `Recibimos tu pedido ${input.orderNumber}`
    : `Actualización de tu pedido ${input.orderNumber}: ${orderStatusLabels[input.status]}`;
  const intro = input.kind === "confirmation"
    ? "Tu pedido se registró correctamente. Te avisaremos cuando avance."
    : `El estado de tu pedido ahora es: ${orderStatusLabels[input.status]}.`;
  const trackingRows = shipped
    ? `<p><strong>Paquetería:</strong> ${escapeHtml(input.carrier || "Por confirmar")}</p><p><strong>Número de guía:</strong> ${escapeHtml(input.trackingNumber || "")}</p>`
    : "";
  const html = `<div style="font-family:Arial,sans-serif;color:#172033;line-height:1.6"><h1 style="font-size:22px">Hola ${escapeHtml(input.firstName)},</h1><p>${intro}</p><p><strong>Pedido:</strong> ${escapeHtml(input.orderNumber)}</p><p><strong>Estado:</strong> ${escapeHtml(orderStatusLabels[input.status])}</p>${trackingRows}<p><a href="${escapeHtml(orderUrl)}">Consultar pedido y pago</a></p><p>El Club del Coleccionista</p></div>`;
  const text = [
    `Hola ${input.firstName},`,
    intro,
    `Pedido: ${input.orderNumber}`,
    `Estado: ${orderStatusLabels[input.status]}`,
    ...(shipped ? [`Paquetería: ${input.carrier || "Por confirmar"}`, `Número de guía: ${input.trackingNumber || ""}`] : []),
    `Consulta tu pedido: ${orderUrl}`,
    "El Club del Coleccionista",
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], subject, html, text }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
