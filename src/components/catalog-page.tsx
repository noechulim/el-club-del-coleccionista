import { Suspense } from "react";
import { connection } from "next/server";
import { getActiveProducts } from "@/lib/products-server";
import type { CatalogFilters } from "@/lib/catalog";
import { ProductGrid } from "./product-grid";
import { StorePage } from "./store-page";

export function CatalogPage({ title, intro, scope = {} }: { title: string; intro: string; scope?: Partial<CatalogFilters> }) {
  return <StorePage title={title} intro={intro}><Suspense fallback={null}><CatalogResults scope={scope} /></Suspense></StorePage>;
}
export async function CatalogResults({ scope = {} }: { scope?: Partial<CatalogFilters> }) {
  await connection();
  const products = await getActiveProducts();
  return products === null ? <p className="catalog-empty" role="alert">No pudimos cargar el catálogo. Intenta de nuevo en unos momentos.</p> : <ProductGrid products={products} scope={scope} />;
}
