import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { StorePage } from "@/components/store-page";
import { AdminNav } from "@/components/admin-nav";
import { getAdminAccess } from "@/lib/admin-access";
import { PagePlaceholder } from "@/components/page-shell";
export default function Page() { return <StorePage title="Administración"><Suspense fallback={<PagePlaceholder />}><Summary /></Suspense></StorePage>; }
async function Summary() { await connection(); const db = await getAdminAccess(); if (!db) return <p>Inicia sesión con una cuenta administradora en <Link href="/cuenta">Mi cuenta</Link>.</p>; const results = await Promise.all([db.from("products").select("id", { count: "exact", head: true }), db.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending_payment", "proof_submitted", "payment_confirmed", "preparing"]), db.from("contact_messages").select("id", { count: "exact", head: true }).neq("status", "resolved")]); return <div className="route-content-entrance"><AdminNav /><div className="store-tile-grid">{["Productos", "Pedidos por atender", "Consultas abiertas"].map((title, i) => <Link key={title} className="store-tile" href={["/admin/products", "/admin/orders", "/admin/contacto"][i]}><h2>{title}</h2><strong>{results[i].error ? "No disponible" : results[i].count ?? 0}</strong><span>Administrar →</span></Link>)}</div></div>; }
