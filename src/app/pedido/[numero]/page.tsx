import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { StorePage } from "@/components/store-page";
import { PaymentInstructions } from "@/components/payment-instructions";
import { PaymentProofUpload } from "@/app/checkout/payment-proof-upload";
import { getPaymentDetails } from "@/lib/payment-details";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { formatMXN, orderStatusLabels, type OrderStatus } from "@/lib/orders";
import { getCarrierTracking } from "@/lib/carriers";
import "../../styles/checkout.css";
import "../../styles/tracking.css";
import { PagePlaceholder } from "@/components/page-shell";

export const metadata = {
  title: "Tu pedido | El Club del Coleccionista",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

type Props = {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

export default function Page(props: Props) {
  return (
    <StorePage
      title="Tu pedido"
      intro="Consulta el pago y el estado de tu compra con tu enlace privado."
    >
      <Suspense fallback={<PagePlaceholder />}>
        <Order {...props} />
      </Suspense>
    </StorePage>
  );
}

async function Order({ params, searchParams }: Props) {
  await connection();
  const { numero } = await params;
  const { token } = await searchParams;
  const unavailable = (
    <p className="store-notice">
      No pudimos abrir el pedido. Usa el enlace completo de tu confirmación o{" "}
      <Link href="/contacto">contacta a la tienda</Link>.
    </p>
  );

  if (
    !/^ECC-\d{6}-\d{6}$/.test(numero) ||
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token) ||
    !hasSupabaseConfig()
  ) {
    return unavailable;
  }

  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("get_order_payment_details", {
    p_order_number: numero,
    p_token: token,
  });

  if (error || !data) return unavailable;

  const order = data as {
    order_number: string;
    status: OrderStatus;
    subtotal: number;
    shipping_cost: number;
    total: number;
    shipping_carrier: string;
    tracking_number: string;
    cancellation_reason?: string | null;
  };

  const carrierInfo =
    order.shipping_carrier || order.tracking_number
      ? getCarrierTracking(order.shipping_carrier, order.tracking_number)
      : null;

  return (
    <section className="store-article order-private-view">
      <div className="order-private-header">
        <div>
          <p className="tracking-eyebrow">ENLACE PRIVADO DE PEDIDO</p>
          <h2>{order.order_number}</h2>
        </div>
        <span className={`order-status status-${order.status}`}>
          {orderStatusLabels[order.status]}
        </span>
      </div>

      {order.status === "cancelled" && <div className="tracking-cancelled-banner"><strong>Este pedido fue cancelado.</strong><p>{order.cancellation_reason === "payment_timeout" ? "No recibimos el comprobante dentro de las 24 horas. El pedido se canceló automáticamente y las piezas volvieron al inventario." : "Si tienes alguna consulta sobre este pedido, escríbenos a través del formulario de contacto."}</p></div>}

      <div className="order-private-totals">
        <div>
          <span>Subtotal productos:</span>
          <strong>{formatMXN(order.subtotal)}</strong>
        </div>
        <div>
          <span>Costo de envío:</span>
          <strong>{Number(order.shipping_cost) === 0 ? "Gratis" : formatMXN(order.shipping_cost)}</strong>
        </div>
        <div className="order-private-grand-total">
          <span>Total de la orden:</span>
          <strong>{formatMXN(order.total)}</strong>
        </div>
      </div>

      {order.status === "pending_payment" && (
        <div className="order-private-payment-section">
          <PaymentInstructions
            details={getPaymentDetails()}
            orderNumber={numero}
            total={order.total}
          />
          <PaymentProofUpload orderNumber={numero} proofToken={token} />
        </div>
      )}

      {order.status === "proof_submitted" && (
        <div className="tracking-pending-notice">
          <strong>✓ Comprobante recibido</strong>
          <p>Tu comprobante de transferencia se encuentra en revisión manual. En breve validaremos el pago para comenzar la preparación.</p>
        </div>
      )}

      {order.status === "payment_confirmed" && (
        <div className="checkout-proof-success">
          <strong>✓ Pago validado exitosamente</strong>
          <p>Tu pago ha sido confirmado. Pasamos tu pedido al área de empaque y preparación.</p>
        </div>
      )}

      {order.status === "preparing" && (
        <div className="checkout-proof-success">
          <strong>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"middle",marginRight:"6px"}} aria-hidden="true">
              <polyline points="21 8 21 21 3 21 3 8"/>
              <rect x="1" y="3" width="22" height="5"/>
              <line x1="10" y1="12" x2="14" y2="12"/>
            </svg>
            Pedido en preparación
          </strong>
          <p>Estamos protegiendo tus cartas y productos para su recolección por la paquetería.</p>
        </div>
      )}

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
              <p className="tracking-shipment-title">¡Tu pedido ha sido enviado!</p>
              <p className="tracking-shipment-subtitle">Puedes darle seguimiento con los datos asignados:</p>
            </div>
          </div>

          <div className="tracking-shipment-details">
            {carrierInfo && (
              <div className="tracking-info-row">
                <div className="tracking-info-col">
                  <span className="tracking-info-label">Paquetería</span>
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
                <span>Rastrear en portal de {carrierInfo.name}</span>
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

      <div className="order-private-footer">
        <p>Guarda este enlace en tus favoritos para volver a consultar tu orden en cualquier momento.</p>
        <Link className="cart-primary" href="/catalogo">
          Volver al catálogo
        </Link>
      </div>
    </section>
  );
}
