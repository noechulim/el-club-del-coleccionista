import Link from "next/link";
import { StorePage } from "@/components/store-page";
import { catalogCategories } from "@/lib/catalog";
export const metadata = { title: "Categorías | El Club del Coleccionista" };
export default function Page() { return <StorePage title="Categorías" intro="Explora los formatos de Pokémon TCG y elige cómo seguir tu colección."><div className="store-tile-grid">{catalogCategories.map((category) => <Link className="store-tile" href={`/categorias/${category.slug}`} key={category.slug}><span className="eyebrow">{category.type ? "SELLADO" : "COLECCIÓN"}</span><h2>{category.label}</h2><span>Explorar productos →</span></Link>)}</div></StorePage>; }
