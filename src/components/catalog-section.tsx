import Link from "next/link";
import { ArrowIcon } from "./arrow-icon";
import { connection } from "next/server";
import { getActiveProducts } from "@/lib/products-server";
import { ProductGrid } from "./product-grid";
export async function CatalogSection() {
  await connection();
  const products = await getActiveProducts();
  if (products === null) return <section className="section-wrap featured-section"><p className="catalog-empty">No pudimos cargar los productos. Intenta más tarde.</p></section>;
  const singles = products.filter((product) => product.category === "single" || product.category === "graded");
  const otherProducts = products.filter((product) => product.category !== "single" && product.category !== "graded");
  const primary = [...otherProducts.filter((product) => product.is_featured), ...otherProducts.filter((product) => !product.is_featured)].slice(0, 10);
  const homeSingles = [...singles.filter((product) => product.is_featured), ...singles.filter((product) => !product.is_featured)].slice(0, 10);
  return <>
    {primary.length > 0 && <section className="section-wrap featured-section" id="catalogo">
      <div className="section-heading"><div><p className="eyebrow">SELECCIÓN DEL CLUB</p><h2>{primary.some((product) => product.is_featured) ? "Destacados y recientes" : "Productos de la tienda"}</h2></div><Link prefetch={true} className="text-link" href="/catalogo">Ver catálogo <ArrowIcon /></Link></div>
      <ProductGrid products={primary} showFilters={false} />
    </section>}
    <section className="section-wrap featured-section" id="cartas-sueltas">
      <div className="section-heading"><div><p className="eyebrow">PIEZAS PARA TU COLECCIÓN</p><h2>Cartas sueltas</h2></div><Link prefetch={true} className="text-link" href="/categorias/cartas-sueltas">Ver todas <ArrowIcon /></Link></div>
      {homeSingles.length ? <ProductGrid products={homeSingles} showFilters={false} /> : <div className="catalog-empty"><p>Estamos preparando nuevas cartas sueltas para el catálogo.</p><Link prefetch={true} className="text-link" href="/categorias/cartas-sueltas">Explorar cartas sueltas <ArrowIcon /></Link></div>}
    </section>
  </>;
}
