import Link from "next/link";
import type { Product } from "@/lib/products";
import { collectionHref } from "@/lib/catalog";
export function CollectionGrid({ products, limit }: { products: Product[]; limit?: number }) {
  const names = [...new Set(products.map((product) => product.set_name).filter(Boolean))];
  const collections = names.map((name) => ({ name, products: products.filter((product) => product.set_name === name) }));
  return collections.length ? <div className="store-tile-grid">{collections.slice(0, limit).map(({ name, products: entries }) => <Link prefetch={true} className="store-tile collection-tile" href={collectionHref(name)} key={name}><div className="collection-art" role="img" aria-label={name} style={{ backgroundImage: `url("${entries[0].image_url.replaceAll('"', '')}")` }} /><div><p className="eyebrow">POKÉMON TCG</p><h2>{name}</h2><p>{entries.filter((product) => product.stock > 0).length} productos disponibles · {entries.length} en catálogo</p><span>Ver expansión →</span></div></Link>)}</div> : <p className="catalog-empty">Las expansiones aparecerán aquí cuando haya productos publicados con una colección.</p>;
}
