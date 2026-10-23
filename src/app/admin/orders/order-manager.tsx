"use client";
import { StoreSelect } from "@/components/store-select";

import { useActionState, useState } from "react";
import { formatMXN, orderStatusLabels, type CustomerOrder } from "@/lib/orders";
import { releasePreorder, updateOrder, type OrderActionState } from "./actions";

const statuses = ["pending_payment", "proof_submitted", "payment_confirmed", "preparing", "shipped", "cancelled"] as const;

export function OrderManager({ orders }: { orders: (CustomerOrder & { customer_name: string; customer_email: string; customer_phone: string; shipping_address: string; payment_proof_url: string | null })[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const visible = orders.filter((order) => (!status || order.status === status) && `${order.order_number} ${order.customer_name} ${order.customer_email}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="admin-order-list"><div className="catalog-filter-row"><label>Buscar pedido<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Número, cliente o correo" /></label><label>Estado<StoreSelect label="Filtrar por estado" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option>{statuses.map((value) => <option key={value} value={value}>{orderStatusLabels[value]}</option>)}</StoreSelect></label></div><div className="admin-section-title"><div><p className="admin-eyebrow">VENTAS</p><h2>Pedidos <span>({orders.length})</span></h2></div></div>
    {visible.length === 0 ? <p className="admin-empty">Aún no hay pedidos registrados.</p> : visible.map((order) => <article className="admin-order-card" key={order.id}>
      <header className="admin-order-title"><div><h3>{order.order_number}</h3><p>{order.created_at_label}</p></div><strong>{formatMXN(Number(order.total))}</strong></header>
      <div className="admin-order-customer"><strong>{order.customer_name}</strong><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a>{order.customer_phone && <span>{order.customer_phone}</span>}<p>{order.shipping_address}</p></div>
      {order.payment_proof_url && <p className="admin-proof-link"><a href={order.payment_proof_url} target="_blank" rel="noreferrer">Revisar comprobante de pago</a></p>}
      <div className="admin-order-lines">{order.order_items.map((item, index) => <p key={`${order.id}-${index}`}><span>{item.quantity} × {item.product_name}{item.set_name ? ` · ${item.set_name}` : ""}</span><strong>{formatMXN(Number(item.line_total))}</strong></p>)}</div>
      {order.contains_preorder && <PreorderRelease order={order} />}
      <OrderStatusForm order={order} />
    </article>)}
  </section>;
}

function PreorderRelease({ order }: { order: CustomerOrder }) {
  const [state, action, pending] = useActionState(releasePreorder, {});
  return <section className="store-notice"><strong>Pedido con preventa</strong><p>{order.preorders_ready ? "Todos los productos de preventa están listos." : "Espera a recibir todas las unidades antes de preparar el envío."}</p>{!order.preorders_ready && order.status !== "cancelled" && order.status !== "shipped" && <form action={action}><input type="hidden" name="id" value={order.id} /><label><input type="checkbox" required /> Confirmo que llegaron todas las unidades de este pedido.</label> <button className="admin-secondary" disabled={pending}>Marcar preventa lista</button></form>}{state.error && <p role="alert">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}</section>;
}
function OrderStatusForm({ order }: { order: CustomerOrder }) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(updateOrder, {});
  return <form className="admin-order-form" action={action}>
    <input type="hidden" name="id" value={order.id} />
    <label>Estado<StoreSelect label="Estado del pedido" name="status" defaultValue={order.status}>{statuses.map((status) => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</StoreSelect></label>
    <label>Paquetería<input name="carrier" defaultValue={order.shipping_carrier ?? ""} maxLength={100} placeholder="Ej. DHL" /></label>
    <label>Número de guía<input name="trackingNumber" defaultValue={order.tracking_number ?? ""} maxLength={120} placeholder="Se requiere para marcar Enviado" /></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.message && <p className="form-notice" role="status">{state.message}</p>}{state.warning && <p className="form-error" role="status">{state.warning}</p>}
    <button className="admin-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar actualización"}</button>
  </form>;
}
