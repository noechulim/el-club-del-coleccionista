import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { CustomerOrder } from "@/lib/orders";
import { AdminNav } from "@/components/admin-nav";
import { OrderManager } from "./order-manager";
import "../../styles/admin-products.css";
import "../../styles/admin-orders.css";

export default function AdminOrdersPage() {
  return <Suspense fallback={null}><AdminOrdersContent /></Suspense>;
}

async function AdminOrdersContent() {
  await connection();
  let orders: (CustomerOrder & { customer_name: string; customer_email: string; customer_phone: string; shipping_address: string; payment_proof_url: string | null })[] = [];
  let message = "";
  if (!hasSupabaseConfig()) message = "Configura Supabase en .env.local para administrar pedidos.";
  else {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: isAdmin } = user ? await supabase.rpc("is_store_admin") : { data: false };
    if (!user) message = "Inicia sesión con tu cuenta para administrar pedidos.";
    else if (!isAdmin) message = "Tu cuenta aún no tiene permisos de administración.";
    else {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (error) message = "No se pudieron cargar los pedidos. Aplica las migraciones de pedidos y administración en Supabase.";
      else orders = await Promise.all((data ?? []).map(async (order) => ({
        ...order,
        created_at_label: new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(order.created_at)),
        customer_name: `${order.customer_first_name} ${order.customer_last_name}`,
        shipping_address: `${order.shipping_street} ${order.shipping_exterior_number}${order.shipping_interior_number ? ` int. ${order.shipping_interior_number}` : ""}, ${order.shipping_neighborhood}, ${order.shipping_city}, ${order.shipping_state}, CP ${order.shipping_postal_code}`,
        payment_proof_url: order.payment_proof_path ? (await supabase.storage.from("payment-proofs").createSignedUrl(order.payment_proof_path, 3600)).data?.signedUrl ?? null : null,
      }))) as typeof orders;
    }
  }
  return <><SiteHeader /><main className="admin-page"><header className="admin-heading"><div><p className="admin-eyebrow">EL CLUB DEL COLECCIONISTA</p><h1>Administrar pedidos</h1><p>Actualiza el avance y agrega datos de envío.</p></div><Link href="/cuenta">Volver a mi cuenta</Link></header><AdminNav />{message ? <section className="admin-notice">{message}</section> : <OrderManager orders={orders} />}</main><SiteFooter /></>;
}
