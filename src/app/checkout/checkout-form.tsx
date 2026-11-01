"use client";
import { StoreSelect } from "@/components/store-select";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { mexicanStates as states, shippingCost } from "@/lib/shipping";
import { useCart } from "@/lib/cart-context";
import type { CustomerAddress } from "@/lib/addresses";
import { placeOrder } from "./actions";
import type { CheckoutState } from "./actions";
import { PaymentInstructions, type PaymentDetails } from "@/components/payment-instructions";
import { PaymentProofUpload } from "./payment-proof-upload";
import { ArrowIcon } from "@/components/arrow-icon";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const initialState: CheckoutState = {};
const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const money = (amount: number) => `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

type CheckoutAddress = Pick<CustomerAddress, "street" | "exterior_number" | "interior_number" | "neighborhood" | "city" | "state" | "postal_code"> & { reference: string };
const emptyAddress: CheckoutAddress = { street: "", exterior_number: "", interior_number: "", neighborhood: "", city: "", state: "", postal_code: "", reference: "" };

export function CheckoutForm({ initialCustomer, initialAddresses = [], paymentDetails }: { initialCustomer: { firstName: string; lastName: string; email: string }; initialAddresses?: CustomerAddress[]; paymentDetails: PaymentDetails }) {
  const { items, subtotal, ready, clearCart } = useCart();
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot);
  const [state, formAction, pending] = useActionState(placeOrder, initialState);
  const clearedOrder = useRef<string | null>(null);
  const formTouched = useRef(false);
  const [savedAddresses, setSavedAddresses] = useState(initialAddresses);
  const defaultAddress = savedAddresses.find((address) => address.is_default);
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id ?? "");
  const [address, setAddress] = useState<CheckoutAddress>(defaultAddress ? { ...defaultAddress, reference: "" } : emptyAddress);
  const [customer, setCustomer] = useState(() => {
    if (!defaultAddress) return { ...initialCustomer, phone: "" };
    const [firstName = "", ...lastName] = defaultAddress.recipient_name.trim().split(/\s+/);
    return { ...initialCustomer, firstName, lastName: lastName.join(" "), phone: defaultAddress.phone };
  });
  const shipping = shippingCost(subtotal);

  function selectAddress(id: string) {
    setSelectedAddressId(id);
    const saved = savedAddresses.find((item) => item.id === id);
    if (!saved) {
      setAddress(emptyAddress);
      setCustomer({ ...initialCustomer, phone: "" });
      return;
    }
    setAddress({ ...saved, reference: "" });
    const [firstName = "", ...lastName] = saved.recipient_name.trim().split(/\s+/);
    setCustomer((current) => ({ ...current, firstName, lastName: lastName.join(" "), phone: saved.phone }));
  }

  useEffect(() => {
    if (state.orderNumber && clearedOrder.current !== state.orderNumber) {
      clearedOrder.current = state.orderNumber;
      clearCart();
      requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    }
  }, [state.orderNumber, clearCart]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
    let cancelled = false;
    async function loadSavedDetails() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;
        const [{ data: profile }, { data: addresses }] = await Promise.all([
          supabase.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle(),
          supabase.from("customer_addresses").select("id, label, recipient_name, phone, street, exterior_number, interior_number, neighborhood, city, state, postal_code, is_default").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
        ]);
        if (cancelled) return;
        const list = (addresses ?? []) as CustomerAddress[];
        setSavedAddresses(list);
        if (formTouched.current) return;
        const preferred = list.find((item) => item.is_default);
        const metadata = user.user_metadata ?? {};
        const fullName = String(metadata.full_name ?? metadata.name ?? "").trim().split(/\s+/).filter(Boolean);
        if (preferred) {
          setSelectedAddressId(preferred.id);
          setAddress({ ...preferred, reference: "" });
          const [firstName = "", ...lastName] = preferred.recipient_name.trim().split(/\s+/);
          setCustomer({ firstName, lastName: lastName.join(" "), email: user.email ?? "", phone: preferred.phone });
        } else {
          setCustomer({
            firstName: profile?.first_name || String(metadata.first_name ?? metadata.given_name ?? fullName[0] ?? ""),
            lastName: profile?.last_name || String(metadata.last_name ?? metadata.family_name ?? fullName.slice(1).join(" ")),
            email: user.email ?? "",
            phone: "",
          });
        }
      } catch {
        // El formulario de invitado ya está disponible si no responde la sesión.
      }
    }
    void loadSavedDetails();
    return () => { cancelled = true; };
  }, []);

  if (state.orderNumber) return <section className="checkout-success" aria-live="polite">
    <span className="checkout-success-mark" aria-hidden="true">✓</span>
    <p className="cart-eyebrow">PEDIDO REGISTRADO</p>
    <h2>Gracias por tu compra</h2>
    <p>Tu pedido quedó con estado <strong>Pendiente de pago</strong>.</p>
    <div className="checkout-order-number"><span>Número de pedido</span><strong>{state.orderNumber}</strong></div>
    {state.emailNotice && <p className="checkout-success-note" role="status">{state.emailNotice}</p>}
    <div className="checkout-success-totals"><span>Productos</span><strong>{money(state.subtotal ?? 0)}</strong><span>Envío</span><strong>{state.shippingCost ? money(state.shippingCost) : "Gratis"}</strong><span>Total</span><strong>{money(state.total ?? 0)}</strong></div>
    {state.proofToken && <p className="store-notice"><Link href={`/pedido/${state.orderNumber}?token=${state.proofToken}`}>Abre y guarda tu enlace privado de pago y seguimiento <ArrowIcon /></Link></p>}
    {state.proofToken && <PaymentProofUpload orderNumber={state.orderNumber} proofToken={state.proofToken} />}
    <p className="checkout-success-note">Conserva tu número de pedido. Cuando envíes el comprobante, el estado cambiará a “Comprobante enviado”; la tienda confirmará el pago después de revisarlo.</p>
    <p className="checkout-success-note">¿Compraste como invitado? <Link href="/seguimiento">Consulta aquí el estado de tu pedido.</Link></p>
    <Link className="cart-primary" href="/catalogo">Volver al catálogo</Link>
  </section>;

  if (!hydrated || !ready) return null;
  if (!items.length) return <section className="checkout-empty"><h2>Tu carrito está vacío</h2><p>Agrega productos antes de continuar con la compra.</p><Link className="cart-primary" href="/catalogo">Explorar catálogo</Link></section>;

  return <><form className="checkout-layout" action={formAction} onChangeCapture={() => { formTouched.current = true; }}>
    <div className="checkout-fields">
      <section className="checkout-panel">
        <h2>¿A quién entregamos?</h2>
        <div className="checkout-form-grid">
          <label>Nombre<input name="firstName" autoComplete="given-name" value={customer.firstName} onChange={(event) => setCustomer({ ...customer, firstName: event.target.value })} required maxLength={80} /></label>
          <label>Apellido<input name="lastName" autoComplete="family-name" value={customer.lastName} onChange={(event) => setCustomer({ ...customer, lastName: event.target.value })} required maxLength={100} /></label>
          <label className="checkout-wide">Correo electrónico<input name="email" type="email" autoComplete="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} required maxLength={254} /></label>
          <label className="checkout-wide">Teléfono<input name="phone" type="tel" autoComplete="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} maxLength={30} /></label>
        </div>
      </section>

      <section className="checkout-panel">
        <h2>¿Dónde enviamos tu pedido?</h2>
        {savedAddresses.length > 0 && <label className="saved-address-select">Usar una dirección guardada<StoreSelect label="Usar una dirección guardada" value={selectedAddressId} onChange={(event) => selectAddress(event.target.value)}><option value="">Capturar otra dirección</option>{savedAddresses.map((item) => <option value={item.id} key={item.id}>{item.label}{item.is_default ? " · Principal" : ""} — {item.street} {item.exterior_number}, {item.city}</option>)}</StoreSelect></label>}
        <div className="checkout-form-grid">
          <label className="checkout-wide">Calle<input name="street" autoComplete="address-line1" value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} required maxLength={120} /></label>
          <label>Número exterior<input name="exteriorNumber" value={address.exterior_number} onChange={(event) => setAddress({ ...address, exterior_number: event.target.value })} required maxLength={20} /></label>
          <label>Número interior <span className="checkout-optional">opcional</span><input name="interiorNumber" value={address.interior_number} onChange={(event) => setAddress({ ...address, interior_number: event.target.value })} maxLength={20} /></label>
          <label className="checkout-wide">Colonia<input name="neighborhood" autoComplete="address-level3" value={address.neighborhood} onChange={(event) => setAddress({ ...address, neighborhood: event.target.value })} required maxLength={100} /></label>
          <label>Ciudad o municipio<input name="city" autoComplete="address-level2" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} required maxLength={100} /></label>
          <label>Estado<StoreSelect label="Estado" name="state" autoComplete="address-level1" value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value })} required><option value="" disabled>Selecciona tu estado</option>{states.map((item) => <option key={item} value={item}>{item}</option>)}</StoreSelect></label>
          <label>Código postal<input name="postalCode" value={address.postal_code} onChange={(event) => setAddress({ ...address, postal_code: event.target.value })} inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" minLength={5} maxLength={5} placeholder="00000" required /></label>
          <label className="checkout-wide">Referencias de entrega<textarea name="reference" value={address.reference} onChange={(event) => setAddress({ ...address, reference: event.target.value })} maxLength={300} rows={3} placeholder="Entre calles, color de la fachada o indicaciones para encontrar el domicilio" /></label>
        </div>
      </section>
      <section className="checkout-panel checkout-payment-method">
        <h2>Método de pago</h2>
        <p className="checkout-method-intro">Paga por transferencia bancaria después de confirmar tu pedido.</p>
        <div className="checkout-method-choice"><span className="checkout-method-radio" aria-hidden="true" /><strong>Transferencia bancaria SPEI</strong></div>
        <PaymentInstructions details={paymentDetails} total={subtotal + shipping} checkoutPreview />
      </section>
    </div>

    <aside className="checkout-summary">
      <h2>Tu pedido</h2>
      <div className="checkout-line-items">{items.map(({ product, quantity }) => <div key={product.id}><span>{product.name} <small>× {quantity}</small></span><strong>{money(Number(product.price_mxn) * quantity)}</strong></div>)}</div>
      <div className="checkout-totals"><div><span>Productos</span><strong>{money(subtotal)}</strong></div><div><span>Envío</span><strong>{shipping === 0 ? "Gratis" : money(shipping)}</strong></div><div className="checkout-grand-total"><span>Total</span><strong>{money(subtotal + shipping)}</strong></div></div>
      <input type="hidden" name="items" value={JSON.stringify(items.map(({ product, quantity }) => ({ product_id: product.id, quantity })))} />
      {state.error && <p className="checkout-error" role="alert">{state.error}</p>}
      <button className="cart-primary checkout-submit" type="submit" disabled={pending}>{pending ? "Registrando pedido…" : "Confirmar pedido"}</button>
    </aside>
  </form></>;
}
