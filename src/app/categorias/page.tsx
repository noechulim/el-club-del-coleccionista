import Link from "next/link";
import { StorePage } from "@/components/store-page";
import { catalogCategories } from "@/lib/catalog";
import { ArrowIcon } from "@/components/arrow-icon";
export const metadata = { title: "Categorías | El Club del Coleccionista" };
export default function Page() { return <StorePage title="Categorías" intro="Explora los formatos de Pokémon TCG y elige cómo seguir tu colección."><div className="store-tile-grid category-tile-grid">{catalogCategories.filter((category) => category.category !== "graded").map((category) => <Link className={`store-tile category-tile category-tile-${category.slug}`} href={`/categorias/${category.slug}`} key={category.slug}><span className="category-tile-art" aria-hidden="true"><CategoryArtwork slug={category.slug} /></span><span className="eyebrow">{category.type ? "SELLADO" : "COLECCIÓN"}</span><h2>{category.label}</h2><span>Explorar productos <ArrowIcon /></span></Link>)}</div></StorePage>; }

function CategoryArtwork({ slug }: { slug: string }) {
  if (slug === "cartas-sueltas") return <svg viewBox="0 0 120 100" fill="none"><rect x="36" y="15" width="48" height="68" rx="7" transform="rotate(-10 36 15)"/><rect x="47" y="13" width="48" height="68" rx="7"/><path d="M71 28 75 39l11 4-11 4-4 11-4-11-11-4 11-4 4-11Z"/><circle cx="87" cy="68" r="5"/></svg>;
  if (slug === "accesorios") return <svg viewBox="0 0 120 100" fill="none"><path d="M35 19h48l7 62H29l6-62Z"/><path d="M43 19v-6h32v6M42 36h36M42 47h36M42 58h23"/><circle cx="76" cy="70" r="9"/></svg>;
  if (slug === "sellado" || slug === "collection-box" || slug === "special-collection") return <svg viewBox="0 0 120 100" fill="none"><path d="m24 32 36-17 36 17v43L60 91 24 75V32Z"/><path d="m24 32 36 17 36-17M60 49v42M42 24l36 17"/><path d="M47 55h25v20H47z"/><path d="m54 61 6-4 6 4v7l-6 4-6-4v-7Z"/></svg>;
  return <svg viewBox="0 0 120 100" fill="none"><rect x="28" y="23" width="64" height="54" rx="5"/><path d="M39 23V15h42v8M42 39h36M42 49h36M42 59h20"/><path d="m61 77 7-12 7 12M68 65v15"/></svg>;
}
