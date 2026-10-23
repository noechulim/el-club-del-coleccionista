"use client";

import { useActionState } from "react";
import { formatMXN, orderStatusLabels, type OrderStatus } from "@/lib/orders";
import { getCarrierTracking } from "@/lib/carriers";
import { lookupGuestOrder } from "./actions";
import type { LookupState } from "./actions";

const initialState: LookupState = {};

const progressSteps: { key: OrderStatus; label: string }[] = [
  { key: "pending_payment", label: "Registrado" },
  { key: "proof_submitted", label: "Comprobante recibido" },
  { key: "payment_confirmed", label: "Pago confirmado" },
  { key: "preparing", label: "En preparación" },
  { key: "shipped", label: "Enviado" },
];

function getStepIndex(status: OrderStatus) {
  switch (status) {
    case "pending_payment":
      return 0;
    case "proof_submitted":
      return 1;
    case "payment_confirmed":
      return 2;
    case "preparing":
      return 3;
    case "shipped":
      return 4;
    default:
      return -1;
  }
}

export function TrackingForm() {
  const [state, action, pending] = useActionState(lookupGuestOrder, initialState);
  const order = state.order;

  const carrierInfo = order?.shipping_carrier || order?.tracking_number
    ? getCarrierTracking(order.shipping_carrier, order.tracking_number)
    : null;

  const currentStep = order ? getStepIndex(order.status) : -1;

  return (
    <div className="tracking-card">
      <form action={action} className="tracking-form">
        <label>
          Número de pedido
          <input
            name="orderNumber"
            placeholder="ECC-261023-000001"
            autoComplete="off"
            pattern="ECC-[0-9]{6}-[0-9]{6}"
            title="Formato: ECC-AAMMDD-XXXXXX"
            required
          />
        </label>
        <label>
          Correo electrónico del pedido
          <input
            name="email"
            type="email"
            placeholder="tu-correo@ejemplo.com"
            autoComplete="email"
            required
          />
        </label>
        {state.error && (
          <p className="tracking-error" role="alert">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending}>
          {pending ? "Buscando pedido…" : "Consultar estado de entrega"}
        </button>
      </form>

      {order && (
        <section className="tracking-result" aria-live="polite">
          <header className="tracking-result-heading">
            <div>
              <p className="tracking-eyebrow">PEDIDO VERIFICADO</p>
              <h2>{order.order_number}</h2>
              <p>
                {new Intl.DateTimeFormat("es-MX", {
                  dateStyle: "long",
                  timeZone: "America/Mexico_City",
                }).format(new Date(order.created_at))}
              </p>
            </div>
            <span className={`order-status status-${order.status}`}>
              {orderStatusLabels[order.status]}
            </span>
          </header>

          {/* Stepper visual de progreso */}
          {order.status !== "cancelled" ? (
            <div className="tracking-stepper-container" aria-label="Progreso del pedido">
              <div className="tracking-stepper-bar">
                <div
                  className="tracking-stepper-fill"
                  style={{ width: `${Math.max(0, (currentStep / (progressSteps.length - 1)) * 100)}%` }}
                />
              </div>
              <div className="tracking-steps-grid">
                {progressSteps.map((step, idx) => {
                  const isDone = currentStep >= idx;
                  const isCurrent = currentStep === idx;
                  return (
                    <div
                      key={step.key}
                      className={`tracking-step-node ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
                    >
                      <span className="tracking-node-dot">
                        {isDone ? "✓" : idx + 1}
                      </span>
                      <span className="tracking-node-label">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="tracking-cancelled-banner">
              <strong>Este pedido fue cancelado.</strong>
              <p>Si tienes alguna consulta sobre este pedido o deseas realizar uno nuevo, escríbenos a través de nuestro formulario de contacto o WhatsApp.</p>
            </div>
          )}

          {order.contains_preorder && order.status !== "shipped" && order.status !== "cancelled" && (
            <p className="store-notice tracking-preorder-notice">
              {order.preorders_ready
                ? "Las piezas de preventa ya arribaron a nuestra sucursal. Continuamos con el empaque y preparación de tu entrega."
                : "Este pedido incluye productos en preventa. El envío completo se despachará en cuanto todas las piezas estén disponibles."}
            </p>
          )}

          {/* Tarjeta de Paquetería y Rastreo Directo */}
          {order.status === "shipped" && (
            <div className="tracking-shipment-card">
              <div className="tracking-shipment-header">
                <span className="tracking-shipment-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </span>
                <div>
                  <p className="tracking-shipment-title">¡Tu paquete va en camino!</p>
                  <p className="tracking-shipment-subtitle">Ya fue entregado a la empresa de mensajería para su reparto.</p>
                </div>
              </div>

              <div className="tracking-shipment-details">
                {carrierInfo && (
                  <div className="tracking-info-row">
                    <div className="tracking-info-col">
                      <span className="tracking-info-label">Paquetería asignada</span>
                      <strong className="tracking-info-carrier">{carrierInfo.name}</strong>
                    </div>
                    <div className="tracking-info-col">
                      <span className="tracking-info-label">Número de guía</span>
                      <strong className="tracking-info-code">{carrierInfo.trackingNumber}</strong>
                    </div>
                  </div>
                )}

                {carrierInfo && (
                  <a
                    href={carrierInfo.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tracking-direct-btn"
                  >
                    <span>Rastrear entrega en {carrierInfo.name}</span>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}

          {order.status === "pending_payment" && (
            <div className="tracking-pending-notice">
              <p>Tu orden está pendiente de pago. Recuerda realizar tu transferencia y adjuntar el comprobante en tu enlace privado para comenzar la preparación.</p>
            </div>
          )}

          <div className="tracking-items">
            <span className="tracking-items-title">Contenido del pedido:</span>
            {order.items.map((item, index) => (
              <p key={`${item.product_name}-${index}`}>
                <span>
                  {item.product_name}
                  {item.set_name ? <small>{item.set_name}</small> : null}
                </span>
                <span className="tracking-item-qty">× {item.quantity}</span>
              </p>
            ))}
          </div>

          <footer className="tracking-result-footer">
            <span>Importe total</span>
            <strong>{formatMXN(Number(order.total))}</strong>
          </footer>
        </section>
      )}
    </div>
  );
}
