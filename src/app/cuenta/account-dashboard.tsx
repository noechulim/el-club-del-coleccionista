"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveProfile, signOut, type FormState } from "./actions";
import { formatMXN, orderStatusLabels, type CustomerOrder } from "@/lib/orders";
import { getCarrierTracking } from "@/lib/carriers";
import { PaymentProofUpload } from "@/app/checkout/payment-proof-upload";
import { AddressManager } from "./address-manager";
import type { CustomerAddress } from "@/lib/addresses";

type Tab = "orders" | "profile" | "addresses";

export function AccountDashboard({ email, firstName, lastName, isAdmin, orders, ordersError, proofSetupError, addresses, addressesError }: { email: string; firstName: string; lastName: string; isAdmin?: boolean; orders: CustomerOrder[]; ordersError?: string; proofSetupError?: string; addresses: CustomerAddress[]; addressesError?: string }) {
  const [tab, setTab] = useState<Tab>("orders");

  return (
    <main className="account-page account-page-dashboard">
      <section className="account-dashboard">
        <header className="dashboard-welcome">
          <div className="dashboard-welcome-copy">
            <p className="dashboard-kicker"><span className="welcome-status-dot" /> TU ESPACIO EN EL CLUB</p>
            <h1>Hola, <span>{firstName || email}</span></h1>
            <p className="dashboard-intro">Tu colección, tus datos y tus próximos descubrimientos en un solo lugar.</p>
          </div>
          <div className="welcome-pokemon-mark" aria-hidden="true">
            <PokeballIcon />
          </div>
        </header>

        <div className="dashboard-layout">
          <aside className="account-sidebar">
            <p className="sidebar-label">NAVEGACIÓN</p>
            <nav className="dashboard-tabs" aria-label="Secciones de la cuenta">
              <button type="button" className={tab === "orders" ? "is-active" : ""} aria-current={tab === "orders" ? "page" : undefined} onClick={() => setTab("orders")}><NavIcon name="orders" /><span>Mis pedidos</span></button>
              <button type="button" className={tab === "profile" ? "is-active" : ""} aria-current={tab === "profile" ? "page" : undefined} onClick={() => setTab("profile")}><NavIcon name="profile" /><span>Mis datos</span></button>
              <button type="button" className={tab === "addresses" ? "is-active" : ""} aria-current={tab === "addresses" ? "page" : undefined} onClick={() => setTab("addresses")}><NavIcon name="addresses" /><span>Direcciones</span></button>
              {isAdmin && <Link className="admin-account-link" href="/admin"><NavIcon name="admin" /><span>Resumen de la tienda</span></Link>}
              {isAdmin && <Link className="admin-account-link" href="/admin/contacto"><NavIcon name="orders" /><span>Consultas de clientes</span></Link>}
              {isAdmin && <Link className="admin-account-link" href="/admin/products"><NavIcon name="admin" /><span>Administrar productos</span></Link>}
              {isAdmin && <Link className="admin-account-link" href="/admin/orders"><NavIcon name="orders" /><span>Administrar pedidos</span></Link>}
            </nav>
            <div className="sidebar-account">
              <span className="sidebar-avatar" aria-hidden="true">{(firstName || email).charAt(0).toUpperCase()}</span>
              <span className="sidebar-account-email">{email}</span>
            </div>
            <form action={signOut}><button className="signout-button" type="submit"><NavIcon name="signout" /><span>Cerrar sesión</span></button></form>
          </aside>

          <section className="account-workspace" aria-live="polite">
            {tab === "orders" && <><WorkspaceHeading eyebrow="ACTIVIDAD" title="Mis pedidos" copy="Consulta aquí el recorrido de tus compras." badge={`${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"}`} />{ordersError ? <p className="form-error" role="alert">{ordersError}</p> : <>{proofSetupError && <p className="account-proof-setup-note" role="status">{proofSetupError}</p>}{orders.length ? <OrderList orders={orders} /> : <EmptyPanel title="Tu historial empieza aquí" copy="Cuando realices tu primera compra, podrás seguir desde aquí cada actualización de tu pedido." />}</>}</>}
            {tab === "addresses" && <AddressManager addresses={addresses} loadError={addressesError} />}
            {tab === "profile" && <ProfileForm email={email} firstName={firstName} lastName={lastName} />}
          </section>
        </div>
      </section>
    </main>
  );
}

function OrderList({ orders }: { orders: CustomerOrder[] }) {
  return <div className="account-order-list">{orders.map((order) => <article className="account-order-card" key={order.id}>
    <header className="account-order-header"><div><p className="account-order-number">{order.order_number}</p><p className="account-order-date">{order.created_at_label}</p></div><div className="account-order-summary"><span className={`order-status status-${order.status}`}>{orderStatusLabels[order.status]}</span><strong>{formatMXN(order.total)}</strong></div></header>
    <div className="account-order-items">{order.order_items.map((item, index) => <div className="account-order-item" key={`${order.id}-${index}`}><span>{item.product_name}{item.set_name ? <small>{item.set_name}</small> : null}</span><span>× {item.quantity}</span><strong>{formatMXN(Number(item.line_total))}</strong></div>)}</div>
    {order.contains_preorder && order.status !== "cancelled" && order.status !== "shipped" && <p className="store-notice">{order.preorders_ready ? "Tu preventa está disponible. Continuamos con la preparación del pedido." : "Tu pedido incluye una preventa. Se enviará cuando todos sus productos estén disponibles."}</p>}
    <footer className="account-order-footer">
      <span>Subtotal {formatMXN(Number(order.subtotal))}</span>
      <span>Envío {Number(order.shipping_cost) === 0 ? "Gratis" : formatMXN(Number(order.shipping_cost))}</span>
      {order.status === "shipped" && order.tracking_number && (() => {
        const carrier = getCarrierTracking(order.shipping_carrier, order.tracking_number);
        return (
          <div className="account-tracking-group">
            <p className="account-tracking">
              Guía: <strong>{order.tracking_number}</strong>
              {order.shipping_carrier ? ` · ${order.shipping_carrier}` : ""}
            </p>
            {carrier && (
              <a
                href={carrier.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="account-tracking-link"
              >
                Rastrear en {carrier.name} ↗
              </a>
            )}
          </div>
        );
      })()}
    </footer>
    {order.status === "pending_payment" && order.proof_upload_token && <PaymentProofUpload variant="account" orderNumber={order.order_number} proofToken={order.proof_upload_token} />}
    <div className="account-order-progress" aria-label={`Estado: ${orderStatusLabels[order.status]}`}><span className={order.status === "cancelled" ? "is-cancelled" : "is-current"} />{order.status !== "cancelled" && <><span className={["proof_submitted", "payment_confirmed", "preparing", "shipped"].includes(order.status) ? "is-current" : ""} /><span className={["payment_confirmed", "preparing", "shipped"].includes(order.status) ? "is-current" : ""} /><span className={["preparing", "shipped"].includes(order.status) ? "is-current" : ""} /><span className={order.status === "shipped" ? "is-current" : ""} /></>}</div>
  </article>)}</div>;
}

function WorkspaceHeading({ eyebrow, title, copy, badge }: { eyebrow: string; title: string; copy: string; badge: string }) {
  return <header className="workspace-heading"><div><p className="workspace-eyebrow">{eyebrow}</p><h2>{title}</h2><p>{copy}</p></div><span className="workspace-count">{badge}</span></header>;
}

function EmptyPanel({ title, copy }: { title: string; copy: string }) {
  return (
    <section className="account-empty">
      <div className="empty-scene" aria-hidden="true">
        <span className="empty-card empty-card-back" />
        <span className="empty-card empty-card-front"><PokeballIcon /></span>
      </div>
      <div className="account-empty-copy"><h3>{title}</h3><p>{copy}</p><Link className="empty-explore-link" href="/catalogo">Explorar catálogo <span aria-hidden="true">→</span></Link></div>
    </section>
  );
}

function PokeballIcon() {
  return (
    <svg className="pokeball-icon" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="51" fill="#D9E5F2" />
      <path d="M9 60a51 51 0 0 1 102 0H9Z" fill="#B95068" />
      <path d="M10 60h100" stroke="#101A2B" strokeWidth="12" />
      <circle cx="60" cy="60" r="18" fill="#101A2B" />
      <circle cx="60" cy="60" r="10" fill="#D9E5F2" stroke="#7189A8" strokeWidth="2" />
      <circle cx="60" cy="60" r="51" stroke="#A9C3DD" strokeWidth="3" />
    </svg>
  );
}

function NavIcon({ name }: { name: "orders" | "profile" | "addresses" | "signout" | "admin" }) {
  if (name === "orders") return <svg className="account-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.75h10a1.75 1.75 0 0 1 1.75 1.75v13A1.75 1.75 0 0 1 17 20.25H7a1.75 1.75 0 0 1-1.75-1.75v-13A1.75 1.75 0 0 1 7 3.75Z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>;
  if (name === "profile") return <svg className="account-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.25"/><path d="M5.5 20c.55-3.35 2.75-5.1 6.5-5.1s5.95 1.75 6.5 5.1"/></svg>;
  if (name === "addresses") return <svg className="account-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 10.5-7 10.5S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.25"/></svg>;
  if (name === "admin") return <svg className="account-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.75A1.75 1.75 0 0 1 5.75 4h12.5A1.75 1.75 0 0 1 20 5.75v12.5A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25Z"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>;
  return <svg className="account-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H4"/><path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/></svg>;
}

function ProfileForm({ email, firstName, lastName }: { email: string; firstName: string; lastName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, {});
  return (
    <form action={action} className="profile-form">
      <WorkspaceHeading eyebrow="PERFIL" title="Mis datos" copy="Actualiza la información asociada a tu cuenta." badge="Privado" />
      <div className="auth-name-row">
        <label>Nombre<input name="firstName" defaultValue={firstName} autoComplete="given-name" required /></label>
        <label>Apellido<input name="lastName" defaultValue={lastName} autoComplete="family-name" required /></label>
      </div>
      <label>Correo electrónico<input type="email" value={email} readOnly /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.message && <p className="form-notice" role="status">{state.message}</p>}
      <button className="auth-submit profile-submit" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</button>
    </form>
  );
}
