"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMXN } from "@/lib/orders";

export type PaymentDetails = {
  mode: "demo" | "real" | "unconfigured";
  bank: string;
  holder: string;
  clabe: string;
  account: string;
  whatsappNumber?: string;
};

export function PaymentInstructions({
  details,
  orderNumber,
  total,
}: {
  details: PaymentDetails;
  orderNumber: string;
  total: number;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const formattedTotal = formatMXN(total);
  const numericTotal = Number(total).toFixed(2);

  async function copyToClipboard(text: string, key: string) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2400);
    } catch {
      // Silently handle clipboard denial
    }
  }

  // Pre-formatted WhatsApp link
  const rawWa = details.whatsappNumber?.replace(/[^0-9]/g, "") || "";
  const waNumber = rawWa.length === 10 ? `52${rawWa}` : rawWa;
  const waMessage = encodeURIComponent(
    `Hola, tengo una consulta sobre mi pedido #${orderNumber} en El Club del Coleccionista (Total: ${formattedTotal}).`
  );
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${waMessage}` : null;

  return (
    <section className={`checkout-transfer modern-payment-panel${details.mode === "demo" ? " is-demo" : ""}`}>
      <div className="payment-panel-header">
        <div>
          <p className="cart-eyebrow">PAGO POR TRANSFERENCIA SPEI</p>
          <h3>Instrucciones de pago</h3>
        </div>
        <span className="payment-badge-secure" title="Transferencia bancaria directa">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          SPEI Directo
        </span>
      </div>

      {details.mode === "demo" && (
        <div className="checkout-demo-warning" role="alert">
          <strong>MODO DE PRUEBA ACTIVO</strong>
          <p>Los datos bancarios mostrados a continuación son de demostración. No realices ninguna transferencia real.</p>
        </div>
      )}

      {/* Plazo de pago de 24 horas */}
      <div className="payment-deadline-box">
        <div className="payment-deadline-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div className="payment-deadline-text">
          <strong>Plazo de pago: 24 horas</strong>
          <p>Tus cartas y productos quedan apartados temporalmente. Realiza tu transferencia y sube tu comprobante para asegurar tu orden antes de que se libere el inventario.</p>
        </div>
      </div>

      {details.clabe ? (
        <div className="payment-grid-cards">
          {/* Tarjeta Banco y Titular */}
          <div className="payment-data-card">
            <span className="payment-data-label">Banco receptor</span>
            <strong className="payment-data-value">{details.bank || "Cualquier banco con SPEI"}</strong>
          </div>

          <div className="payment-data-card">
            <span className="payment-data-label">Beneficiario / Titular</span>
            <strong className="payment-data-value">{details.holder}</strong>
          </div>

          {/* Tarjeta CLABE con botón Copiar */}
          <div className="payment-data-card payment-copyable">
            <div>
              <span className="payment-data-label">CLABE Interbancaria (18 dígitos)</span>
              <strong className="payment-data-value payment-mono">{details.clabe}</strong>
            </div>
            <button
              type="button"
              className={`payment-copy-btn ${copiedKey === "clabe" ? "is-copied" : ""}`}
              onClick={() => copyToClipboard(details.clabe, "clabe")}
              aria-label="Copiar CLABE"
            >
              {copiedKey === "clabe" ? (
                <>✓ Copiado</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copiar
                </>
              )}
            </button>
          </div>

          {/* Tarjeta Monto Exacto con botón Copiar */}
          <div className="payment-data-card payment-copyable">
            <div>
              <span className="payment-data-label">Monto exacto a transferir</span>
              <strong className="payment-data-value payment-highlight">{formattedTotal}</strong>
            </div>
            <button
              type="button"
              className={`payment-copy-btn ${copiedKey === "total" ? "is-copied" : ""}`}
              onClick={() => copyToClipboard(numericTotal, "total")}
              aria-label="Copiar Monto"
            >
              {copiedKey === "total" ? (
                <>✓ Copiado</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copiar
                </>
              )}
            </button>
          </div>

          {/* Tarjeta Referencia / Concepto con botón Copiar */}
          <div className="payment-data-card payment-copyable">
            <div>
              <span className="payment-data-label">Concepto / Referencia</span>
              <strong className="payment-data-value payment-mono">{orderNumber}</strong>
            </div>
            <button
              type="button"
              className={`payment-copy-btn ${copiedKey === "orderNumber" ? "is-copied" : ""}`}
              onClick={() => copyToClipboard(orderNumber, "orderNumber")}
              aria-label="Copiar número de pedido"
            >
              {copiedKey === "orderNumber" ? (
                <>✓ Copiado</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copiar
                </>
              )}
            </button>
          </div>

          {details.account && (
            <div className="payment-data-card">
              <span className="payment-data-label">Número de cuenta</span>
              <strong className="payment-data-value payment-mono">{details.account}</strong>
            </div>
          )}
        </div>
      ) : (
        <div className="payment-unavailable-note">
          <p>Los datos bancarios no están disponibles en este momento. Conserva tu número de pedido <strong>{orderNumber}</strong> y contáctanos para proporcionártelos.</p>
        </div>
      )}

      {/* Soporte directo por WhatsApp */}
      <div className="payment-support-box">
        <div className="payment-support-text">
          <p className="payment-support-title">¿Tienes alguna duda con tu pago?</p>
          <p className="payment-support-desc">Estamos disponibles para asistirte con tu comprobante o aclarar cualquier duda sobre tu pedido.</p>
        </div>
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="payment-whatsapp-btn"
            aria-label="Contactar por WhatsApp sobre este pedido"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Escríbenos por WhatsApp
          </a>
        ) : (
          <Link href="/contacto" className="payment-whatsapp-btn payment-contact-btn">
            Contáctanos en tienda
          </Link>
        )}
      </div>
    </section>
  );
}
