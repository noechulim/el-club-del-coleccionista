import type { OrderStatus } from "@/lib/orders";

export const allowedOrderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["payment_confirmed", "cancelled"],
  proof_submitted: ["payment_confirmed", "pending_payment", "cancelled"],
  payment_confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: [],
  cancelled: [],
};

export function orderStatusOptions(current: OrderStatus): OrderStatus[] {
  return [current, ...allowedOrderTransitions[current]];
}
