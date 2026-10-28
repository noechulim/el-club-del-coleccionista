import { Suspense } from "react";
import { getActiveProducts } from "@/lib/products-server";
import { StorePage } from "@/components/store-page";
import { CollectionGrid } from "@/components/collection-grid";
import { PagePlaceholder } from "@/components/page-shell";
export const metadata = { title: "Expansiones | El Club del Coleccionista" };
export default function Page() { return <StorePage title="Expansiones" intro="Todas las colecciones de nuestro catálogo en un solo lugar."><Suspense fallback={<PagePlaceholder />}><Collections /></Suspense></StorePage>; }
async function Collections() { const products = await getActiveProducts(); return <div className="route-content-entrance">{products === null ? <p className="catalog-empty">No pudimos cargar las expansiones. Intenta más tarde.</p> : <CollectionGrid products={products} />}</div>; }
