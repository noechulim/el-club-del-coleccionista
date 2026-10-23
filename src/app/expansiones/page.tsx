import { Suspense } from "react";
import { connection } from "next/server";
import { getActiveProducts } from "@/lib/products-server";
import { StorePage } from "@/components/store-page";
import { CollectionGrid } from "@/components/collection-grid";
export const metadata = { title: "Expansiones | El Club del Coleccionista" };
export default function Page() { return <StorePage title="Expansiones" intro="Todas las colecciones de nuestro catálogo en un solo lugar."><Suspense fallback={null}><Collections /></Suspense></StorePage>; }
async function Collections() { await connection(); const products = await getActiveProducts(); return products === null ? <p className="catalog-empty">No pudimos cargar las expansiones. Intenta más tarde.</p> : <CollectionGrid products={products} />; }
