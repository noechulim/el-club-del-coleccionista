import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin-nav";
import { ProductManager } from "./product-manager";
import type { Product } from "@/lib/products";
import "../../styles/admin-products.css";

export default function AdminProductsPage() {
  return <Suspense fallback={null}><AdminProductsContent /></Suspense>;
}

async function AdminProductsContent() {
  await connection();
  let products: Product[] = [];
  let message = "";
  if (!hasSupabaseConfig()) {
    message = "Configura Supabase en .env.local para administrar el catálogo.";
  } else {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: isAdmin } = user ? await supabase.rpc("is_store_admin") : { data: false };
    if (!user) message = "Inicia sesión con tu cuenta para administrar productos.";
    else if (!isAdmin) message = "Tu cuenta aún no tiene permisos de administración.";
    else {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) message = "No se pudo cargar el catálogo. Aplica las migraciones SQL de productos y filtros del catálogo.";
      else products = (data ?? []) as Product[];
    }
  }

  return <><SiteHeader /><main className="admin-page"><header className="admin-heading"><div><p className="admin-eyebrow">EL CLUB DEL COLECCIONISTA</p><h1>Administrar productos</h1><p>Agrega y actualiza los artículos del catálogo en inglés.</p></div><Link href="/">Volver a la tienda</Link></header><AdminNav />{message ? <section className="admin-notice">{message}</section> : <ProductManager products={products} />}</main><SiteFooter /></>;
}
