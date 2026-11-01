"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { categoryHref } from "@/lib/catalog";
import { categoryLabels } from "@/lib/products";
import { useProductForNavigation } from "@/lib/product-navigation-cache";
import { ProductDetail } from "@/components/product-detail";

/** Muestra la ficha conocida al pulsar una tarjeta mientras llega la versión del servidor. */
export function ProductNavigationPreview() {
  const pathname = usePathname();
  const slug = decodeURIComponent(pathname.split("/").pop() ?? "");
  const product = useProductForNavigation(slug);
  if (!product) return null;

  return <main className="product-detail-page">
    <nav className="product-breadcrumb" aria-label="Migas de pan">
      <Link href="/">Inicio</Link><span>/</span><Link href="/catalogo">Catálogo</Link><span>/</span><Link href={categoryHref(product.category)}>{categoryLabels[product.category]}</Link><span>/</span><span aria-current="page">{product.name}</span>
    </nav>
    <ProductDetail product={product} />
  </main>;
}
