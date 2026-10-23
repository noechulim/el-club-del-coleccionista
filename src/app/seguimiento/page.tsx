import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrackingForm } from "./tracking-form";
import "../styles/tracking.css";

export const metadata: Metadata = {
  title: "Rastrea tu pedido | El Club del Coleccionista",
  description: "Consulta el estado de tu compra, guía y paquetería de forma inmediata.",
};

export default function GuestOrderTrackingPage() {
  return <><SiteHeader /><main className="tracking-page">
    <header className="tracking-heading"><p className="cart-eyebrow">EL CLUB DEL COLECCIONISTA</p><h1>Rastrea tu pedido</h1><p>Consulta el estado de una compra que realizaste como invitado.</p></header>
    <TrackingForm />
    <p className="tracking-account-hint">¿Compras seguido? <Link href="/cuenta">Inicia sesión</Link> para ver todos tus pedidos en un solo lugar.</p>
  </main><SiteFooter /></>;
}
