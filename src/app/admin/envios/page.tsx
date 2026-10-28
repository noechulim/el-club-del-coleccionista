import { Suspense } from "react";
import { connection } from "next/server";
import { StorePage } from "@/components/store-page";
import { AdminNav } from "@/components/admin-nav";
import { getAdminAccess } from "@/lib/admin-access";
import { getShippingConfig } from "@/lib/shipping-server";
import { ShippingForm } from "./shipping-form";
import { PagePlaceholder } from "@/components/page-shell";
export default function Page() { return <StorePage title="Tarifas de envío"><Suspense fallback={<PagePlaceholder />}><Content /></Suspense></StorePage>; }
async function Content() { await connection(); if (!await getAdminAccess()) return <p>Inicia sesión con una cuenta administradora para configurar envíos.</p>; const config = await getShippingConfig(); return <div className="route-content-entrance"><AdminNav /><ShippingForm config={config} /></div>; }
