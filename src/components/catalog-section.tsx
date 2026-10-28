import Link from "next/link";
import { connection } from "next/server";
import { getActiveProducts } from "@/lib/products-server";
import { ProductGrid } from "./product-grid";
import { CollectionGrid } from "./collection-grid";
export async function CatalogSection() {
  await connection();
  const products = await getActiveProducts();
  if (products === null) return <section className="section-wrap featured-section"><p className="catalog-empty">No pudimos cargar los productos. Intenta más tarde.</p></section>;
  const featured = products.filter((product) => product.is_featured);
  return <><section className="section-wrap featured-section"><div className="section-heading"><div><p className="eyebrow">COLECCIONES</p><h2>Explora las expansiones</h2></div><Link prefetch={true} className="text-link" href="/expansiones">Ver todas →</Link></div><CollectionGrid products={products} limit={3} /></section><section className="section-wrap featured-section" id="catalogo"><div className="section-heading"><div><p className="eyebrow">SELECCIÓN DEL CLUB</p><h2>{featured.length ? "Productos destacados" : "Recién agregados"}</h2></div><Link prefetch={true} className="text-link" href="/catalogo">Ver catálogo →</Link></div><ProductGrid products={(featured.length ? featured : products).slice(0, 8)} showFilters={false} /></section><section className="section-wrap store-promo-grid"><Link prefetch={true} className="store-tile" href="/ofertas"><p className="eyebrow">PRECIO ESPECIAL</p><h2>Ofertas del club</h2><span>Descubre los descuentos →</span></Link></section></>;
}
