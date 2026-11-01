import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPaymentDetails } from "@/lib/payment-details";
import { CheckoutForm } from "./checkout-form";
import "../styles/checkout.css";
import { ArrowIcon } from "@/components/arrow-icon";

export default function CheckoutPage() {
  return <><SiteHeader /><main className="checkout-page">
    <header className="checkout-heading"><div><h1>Finalizar compra</h1><p>Completa tus datos para revisar y confirmar el pedido.</p></div><Link href="/carrito"><ArrowIcon direction="left" className="ui-arrow-left" />Volver al carrito</Link></header>
    <CheckoutForm initialCustomer={{ firstName: "", lastName: "", email: "" }} paymentDetails={getPaymentDetails()} />
  </main><SiteFooter /></>;
}
