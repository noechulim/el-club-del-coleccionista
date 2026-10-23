"use client";
import { StoreSelect } from "@/components/store-select";

import Link from "next/link";
import { PurchaseSteps } from "@/components/purchase-steps";
import { useActionState, useEffect, useRef, useState } from "react";
import { mexicanStates as states, shippingCost, type ShippingConfig } from "@/lib/shipping";
import { useCart } from "@/lib/cart-context";
import type { CustomerAddress } from "@/lib/addresses";
import { placeOrder } from "./actions";
import type { CheckoutState } from "./actions";
import { PaymentInstructions, type PaymentDetails } from "@/components/payment-instructions";
import { PaymentProofUpload } from "./payment-proof-upload";

const initialState: CheckoutState = {};
const money = (amount: number) => `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

type CheckoutAddress = Pick<CustomerAddress, "street" | "exterior_number" | "interior_number" | "neighborhood" | "city" | "state" | "postal_code">;
const emptyAddress: CheckoutAddress = { street: "", exterior_number: "", interior_number: "", neighborhood: "", city: "", state: "", postal_code: "" };

export function CheckoutForm({ initialCustomer, initialAddresses = [], paymentDetails, shippingConfig }: { initialCustomer: { firstName: string; lastName: string; email: string }; initialAddresses?: CustomerAddress[]; paymentDetails: PaymentDetails; shippingConfig: ShippingConfig }) {
  const { items, subtotal, ready, clearCart } = useCart();
  const [state, formAction, pending] = useActionState(placeOrder, initialState);
  const clearedOrder = useRef<string | null>(null);
  const defaultAddress = initialAddresses.find((address) => address.is_default);
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id ?? "");
  const [address, setAddress] = useState<CheckoutAddress>(defaultAddress ?? emptyAddress);
  const [customer, setCustomer] = useState(() => {
    if (!defaultAddress) return { ...initialCustomer, phone: "" };
    const [firstName = "", ...lastName] = defaultAddress.recipient_name.trim().split(/\s+/);
    return { ...initialCustomer, firstName, lastName: lastName.join(" "), phone: defaultAddress.phone };
  });
  const shipping = shippingCost(shippingConfig, subtotal, address.state);

  function selectAddress(id: string) {
    setSelectedAddressId(id);
    const saved = initialAddresses.find((item) => item.id === id);
    if (!saved) {
      setAddress(emptyAddress);
      setCustomer({ ...initialCustomer, phone: "" });
      return;
    }
    setAddress(saved);
    const [firstName = "", ...lastName] = saved.recipient_name.trim().split(/\s+/);
    setCustomer((current) => ({ ...current, firstName, lastName: lastName.join(" "), phone: saved.phone }));
  }

  useEffect(() => {
    if (state.orderNumber && clearedOrder.current !== state.orderNumber) {
      clearedOrder.current = state.orderNumber;
      clearCart();
    }
  }, [state.orderNumber, clearCart]);

  if (state.orderNumber) return <section className="checkout-success" aria-live="polite">
    <PurchaseSteps step="confirmation" /><span className="checkout-success-mark" aria-hidden="true">✓</span>
    <p className="cart-eyebrow">PEDIDO REGISTRADO</p>
    <h2>Gracias por tu compra</h2>
    <p>Tu pedido quedó con estado <strong>Pendiente de pago</strong>.</p>
    <div className="checkout-order-number"><span>Número de pedido</span><strong>{state.orderNumber}</strong></div>
    {state.emailNotice && <p className="checkout-success-note" role="status">{state.emailNotice}</p>}
    <div className="checkout-success-totals"><span>Productos</span><strong>{money(state.subtotal ?? 0)}</strong><span>Envío</span><strong>{state.shippingCost ? money(state.shippingCost) : "Gratis"}</strong><span>Total</span><strong>{money(state.total ?? 0)}</strong></div>
    <PaymentInstructions details={paymentDetails} orderNumber={state.orderNumber} total={state.total ?? 0} />
    {state.proofToken && <p className="store-notice"><Link href={`/pedido/${state.orderNumber}?token=${state.proofToken}`}>Abre y guarda tu enlace privado de pago y seguimiento →</Link></p>}
    {state.proofToken && <PaymentProofUpload orderNumber={state.orderNumber} proofToken={state.proofToken} />}
    <p className="checkout-success-note">Conserva tu número de pedido. Cuando envíes el comprobante, el estado cambiará a “Comprobante enviado”; la tienda confirmará el pago después de revisarlo.</p>
    <p className="checkout-success-note">¿Compraste como invitado? <Link href="/seguimiento">Consulta aquí el estado de tu pedido.</Link></p>
    <Link className="cart-primary" href="/catalogo">Volver al catálogo</Link>
  </section>;

  if (!ready) return null;
  if (!items.length) return <section className="checkout-empty"><h2>Tu carrito está vacío</h2><p>Agrega productos antes de continuar con la compra.</p><Link className="cart-primary" href="/catalogo">Explorar catálogo</Link></section>;

  return <><PurchaseSteps step="checkout" /><form className="checkout-layout" action={formAction}>
    <div className="checkout-fields">
      <section className="checkout-panel">
        <p className="cart-eyebrow">CONTACTO</p><h2>¿A quién entregamos?</h2>
        <div className="checkout-form-grid">
          <label>Nombre<input name="firstName" autoComplete="given-name" value={customer.firstName} onChange={(event) => setCustomer({ ...customer, firstName: event.target.value })} required maxLength={80} /></label>
          <label>Apellido<input name="lastName" autoComplete="family-name" value={customer.lastName} onChange={(event) => setCustomer({ ...customer, lastName: event.target.value })} required maxLength={100} /></label>
          <label className="checkout-wide">Correo electrónico<input name="email" type="email" autoComplete="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} required maxLength={254} /></label>
          <label className="checkout-wide">Teléfono <span className="checkout-optional">opcional</span><input name="phone" type="tel" autoComplete="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} maxLength={30} /></label>
        </div>
      </section>

      <section className="checkout-panel">
        <p className="cart-eyebrow">DIRECCIÓN</p><h2>¿Dónde enviamos tu pedido?</h2>
        {initialAddresses.length > 0 && <label className="saved-address-select">Usar una dirección guardada<StoreSelect label="Usar una dirección guardada" value={selectedAddressId} onChange={(event) => selectAddress(event.target.value)}><option value="">Capturar otra dirección</option>{initialAddresses.map((item) => <option value={item.id} key={item.id}>{item.label}{item.is_default ? " · Principal" : ""} — {item.street} {item.exterior_number}, {item.city}</option>)}</StoreSelect></label>}
        <div className="checkout-form-grid">
          <label className="checkout-wide">Calle<input name="street" autoComplete="address-line1" value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} required maxLength={120} /></label>
          <label>Número exterior<input name="exteriorNumber" value={address.exterior_number} onChange={(event) => setAddress({ ...address, exterior_number: event.target.value })} required maxLength={20} /></label>
          <label>Número interior <span className="checkout-optional">opcional</span><input name="interiorNumber" value={address.interior_number} onChange={(event) => setAddress({ ...address, interior_number: event.target.value })} maxLength={20} /></label>
          <label className="checkout-wide">Colonia<input name="neighborhood" autoComplete="address-level3" value={address.neighborhood} onChange={(event) => setAddress({ ...address, neighborhood: event.target.value })} required maxLength={100} /></label>
          <label>Ciudad o municipio<input name="city" autoComplete="address-level2" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} required maxLength={100} /></label>
          <label>Estado<StoreSelect label="Estado" name="state" autoComplete="address-level1" value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value })} required><option value="" disabled>Selecciona tu estado</option>{states.map((item) => <option key={item} value={item}>{item}</option>)}</StoreSelect></label>
          <label>Código postal<input name="postalCode" value={address.postal_code} onChange={(event) => setAddress({ ...address, postal_code: event.target.value })} inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" minLength={5} maxLength={5} placeholder="00000" required /></label>
        </div>
      </section>
    </div>

    <aside className="checkout-summary">
      <p className="cart-eyebrow">RESUMEN</p><h2>Tu pedido</h2>
      <div className="checkout-line-items">{items.map(({ product, quantity }) => <div key={product.id}><span>{product.name}{product.is_preorder ? " · Preventa" : ""} <small>× {quantity}</small></span><strong>{money(Number(product.price_mxn) * quantity)}</strong></div>)}</div>
      <div className="checkout-totals"><div><span>Productos</span><strong>{money(subtotal)}</strong></div><div><span>Envío</span><strong>{shipping ? money(shipping) : "Gratis"}</strong></div><div className="checkout-grand-total"><span>Total</span><strong>{money(subtotal + shipping)}</strong></div></div>
      <p className="checkout-shipping-hint">{shippingConfig.free_from === null ? "El envío depende de tu estado de entrega." : `Envío gratis desde ${money(shippingConfig.free_from)}.`} {!address.state && "Selecciona tu estado para ver la tarifa de entrega."}</p>
      {items.some(({ product }) => product.is_preorder) && <p className="store-notice">Tu pedido incluye preventas. El pago cubre el total y el envío se realizará cuando todos los productos estén disponibles. Las fechas de lanzamiento son estimadas.</p>}
      <p className="checkout-payment-note">Al continuar puedes consultar nuestras <Link href="/terminos-y-condiciones">condiciones de compra</Link>, <Link href="/envios">información de envíos</Link> y <Link href="/aviso-de-privacidad">privacidad</Link>.</p>
      <input type="hidden" name="items" value={JSON.stringify(items.map(({ product, quantity }) => ({ product_id: product.id, quantity })))} />
      {state.error && <p className="checkout-error" role="alert">{state.error}</p>}
      <button className="cart-primary checkout-submit" type="submit" disabled={pending}>{pending ? "Registrando pedido…" : "Confirmar pedido"}</button>
      <p className="checkout-payment-note">Al confirmar, tu pedido se guardará como pendiente de pago. Aún no se realizará ningún cargo.</p>
    </aside>
  </form></>;
}
