import { Suspense } from "react";
import { getActiveProducts } from "@/lib/products-server";
import type { CatalogFilters } from "@/lib/catalog";
import { ProductGrid } from "./product-grid";
import { StorePage } from "./store-page";
import { PagePlaceholder } from "./page-shell";

export function CatalogPage({ title, intro, scope = {} }: { title: string; intro: string; scope?: Partial<CatalogFilters> }) {
  return <StorePage title={title} intro={intro}><Suspense fallback={<PagePlaceholder />}><CatalogResults scope={scope} /></Suspense></StorePage>;
}
export async function CatalogResults({ scope = {} }: { scope?: Partial<CatalogFilters> }) {
  const products = await getActiveProducts();
  return <div className="route-content-entrance">{products === null ? <p className="catalog-empty" role="alert">No pudimos cargar el catálogo. Intenta de nuevo en unos momentos.</p> : <ProductGrid products={products} scope={scope} />}</div>;
}
