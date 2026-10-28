import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getShippingConfig } from "@/lib/shipping-server";
import { getPaymentDetails } from "@/lib/payment-details";
import { CheckoutForm } from "./checkout-form";
import { createSupabaseServerClient, hasSupabaseConfig, getSessionUser } from "@/lib/supabase/server";
import type { CustomerAddress } from "@/lib/addresses";
import "../styles/checkout.css";
import { PagePlaceholder } from "@/components/page-shell";

export default function CheckoutPage() {
  return <><SiteHeader /><Suspense fallback={<PagePlaceholder />}><CheckoutContent /></Suspense><SiteFooter /></>;
}

async function CheckoutContent() {
  await connection();

  let initialCustomer = { firstName: "", lastName: "", email: "" };
  let savedAddresses: CustomerAddress[] = [];
  if (hasSupabaseConfig()) {
    try {
      const supabase = await createSupabaseServerClient();
      const user = await getSessionUser(supabase);
      if (user) {
        const [{ data: profile }, { data: addressData }] = await Promise.all([
          supabase.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle(),
          supabase.from("customer_addresses").select("id, label, recipient_name, phone, street, exterior_number, interior_number, neighborhood, city, state, postal_code, is_default").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
        ]);
        savedAddresses = (addressData ?? []) as CustomerAddress[];
        const metadata = user.user_metadata ?? {};
        const fullName = String(metadata.full_name ?? metadata.name ?? "").trim().split(/\s+/).filter(Boolean);
        initialCustomer = {
          firstName: profile?.first_name || String(metadata.first_name ?? metadata.given_name ?? fullName[0] ?? ""),
          lastName: profile?.last_name || String(metadata.last_name ?? metadata.family_name ?? fullName.slice(1).join(" ")),
          email: user.email ?? "",
        };
      }
    } catch {
      // Guest checkout remains available if session lookup is unavailable.
    }
  }

  const paymentDetails = getPaymentDetails();
  const shippingConfig = await getShippingConfig();

  return <main className="checkout-page">
    <header className="checkout-heading"><div><p className="cart-eyebrow">DATOS DE ENVÍO</p><h1>Finalizar compra</h1><p>Completa tus datos para revisar y confirmar el pedido.</p></div><Link href="/carrito">← Volver al carrito</Link></header>
    <CheckoutForm initialCustomer={initialCustomer} initialAddresses={savedAddresses} paymentDetails={paymentDetails} shippingConfig={shippingConfig} />
  </main>;
}
