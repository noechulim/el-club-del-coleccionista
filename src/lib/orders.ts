export type OrderStatus = "pending_payment" | "proof_submitted" | "payment_confirmed" | "preparing" | "shipped" | "cancelled";

export type OrderItem = {
  is_preorder?: boolean;
  preorder_release_date?: string | null;
  product_name: string;
  set_name: string;
  language: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type CustomerOrder = {
  contains_preorder?: boolean;
  preorders_ready?: boolean;
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  total: number;
  created_at: string;
  created_at_label: string;
  shipping_carrier: string | null;
  tracking_number: string | null;
  proof_upload_token?: string | null;
  order_items: OrderItem[];
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  proof_submitted: "Comprobante enviado",
  payment_confirmed: "Pago confirmado",
  preparing: "En preparación",
  shipped: "Enviado",
  cancelled: "Cancelado",
};

export function formatMXN(value: number) {
  return `$${Number(value).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}
