"use client";
import { StoreSelect } from "@/components/store-select";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/products";
import { hasPriceReduction, isOfferProduct } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { useCartToast } from "@/components/cart-toast-provider";
import { emptyFilters, filterProducts, type CatalogFilters } from "@/lib/catalog";
import { ArrowIcon } from "./arrow-icon";
import { useHydrated } from "@/lib/use-hydrated";
import { rememberProductForNavigation } from "@/lib/product-navigation-cache";

const categoryOptions = [
  { value: "type:booster-box", label: "Booster Box" },
  { value: "type:elite-trainer-box", label: "Elite Trainer Box" },
  { value: "type:booster-bundle", label: "Booster Bundle" },
  { value: "type:collection-box", label: "Collection Boxes" },
  { value: "type:blister-pack", label: "Blister Packs" },
  { value: "type:booster-pack", label: "Booster Packs" },
  { value: "type:special-collection", label: "Special Collections" },
  { value: "category:single", label: "Cartas Sueltas" },
] as const;

export function ProductGrid({ products, showFilters = true, scope = {} }: { products: Product[]; showFilters?: boolean; scope?: Partial<CatalogFilters> }) {
  const params = useSearchParams();
  const { ready } = useCart();
  const hydrated = useHydrated();
  const { announceAdded } = useCartToast();
  const query = showFilters ? params.get("q") || "" : "";
  const filters = { ...emptyFilters };
  if (showFilters) {
    for (const key of ["category", "type", "collection"] as const) filters[key] = params.get(key) || "";
    for (const key of ["available", "offer"] as const) filters[key] = params.get(key) === "1";
  }
  Object.assign(filters, scope);
  const sort = params.get("sort") || "recent";
  const visible = filterProducts(products, filters, query, showFilters ? sort : "recent");
  const collections = [...new Set(products.map((p) => p.set_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es-MX"));
  const selectedCategory = filters.type ? `type:${filters.type}` : filters.category === "single" ? "category:single" : "";
  function update(patch: Record<string, string | boolean>) {
    const url = new URL(window.location.href);
    url.searchParams.delete("page");
    for (const [key, value] of Object.entries(patch)) {
      if (value === "" || value === false) url.searchParams.delete(key);
      else url.searchParams.set(key, value === true ? "1" : value);
    }
    window.history.replaceState(null, "", url.pathname + url.search);
  }
  function clear() { const url = new URL(window.location.href); window.history.replaceState(null, "", url.pathname); }
  return <section id={showFilters ? "catalogo" : undefined} aria-label="Productos">
    {showFilters ? <div className="catalog-browser">
      <div className="catalog-control-deck">
        <div className="catalog-control-grid">
          <div className="catalog-control-field"><label>Expansión</label><StoreSelect label="Expansión" disabled={Boolean(scope.collection)} value={filters.collection} onChange={(e) => update({ collection: e.target.value })}><option value="">Todas las expansiones</option>{collections.map((collection) => <option key={collection} value={collection}>{collection}</option>)}</StoreSelect></div>
          <div className="catalog-control-field"><label>Categoría</label><StoreSelect label="Categoría" disabled={Boolean(scope.category) || Boolean(scope.type)} value={selectedCategory} onChange={(e) => { const value = e.target.value; if (value.startsWith("type:")) update({ category: "sealed", type: value.slice(5) }); else if (value === "category:single") update({ category: "single", type: "" }); else update({ category: "", type: "" }); }}><option value="">Todas</option>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</StoreSelect></div>
        </div>
        <div className="catalog-deck-footer"><div className="catalog-quick-filters"><span className="catalog-quick-label">Mostrar</span><label className={filters.available ? "is-active" : ""}><input type="checkbox" checked={filters.available} onChange={(e) => update({ available: e.target.checked })} />Solo disponibles</label><label className={filters.offer ? "is-active" : ""}><input type="checkbox" disabled={scope.offer === true} checked={filters.offer} onChange={(e) => update({ offer: e.target.checked })} />En oferta</label></div><button className="catalog-sidebar-clear" type="button" onClick={clear}>Restablecer filtros</button></div>
      </div>
      <div className="catalog-results-toolbar"><p className="catalog-results-count" role="status"><strong>{visible.length}</strong> {visible.length === 1 ? "pieza encontrada" : "piezas encontradas"}{query ? ' para “' + query + '”' : ""}</p><label>Ordenar por<StoreSelect label="Ordenar productos" value={sort} onChange={(e) => update({ sort: e.target.value })}><option value="recent">Más recientes</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option><option value="name">Nombre A–Z</option><option value="discount">Mayor descuento</option></StoreSelect></label></div>
      {visible.length ? <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} onAdded={announceAdded} hydrated={hydrated && ready} />)}</div> : <div className="catalog-empty"><h2>{query.trim() ? 'No se encontraron resultados para “' + query.trim() + '”' : "No hay productos en esta selección"}</h2><p>Prueba con otro término o explora el catálogo completo.</p><Link prefetch={true} className="text-link" href="/catalogo">Ver todo el catálogo <ArrowIcon /></Link></div>}
    </div> : visible.length ? <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} onAdded={announceAdded} hydrated={hydrated && ready} />)}</div> : <div className="catalog-empty"><h2>{query.trim() ? 'No se encontraron resultados para “' + query.trim() + '”' : "No hay productos en esta selección"}</h2><p>Prueba con otro término o explora el catálogo completo.</p><Link prefetch={true} className="text-link" href="/catalogo">Ver todo el catálogo <ArrowIcon /></Link></div>}
  </section>;
}
function ProductCard({ product, onAdded, hydrated }: { product: Product; onAdded: (name: string) => void; hydrated: boolean }) {
  const { addItem, items } = useCart();
  const quantityInCart = hydrated ? items.find((item) => item.product.id === product.id)?.quantity ?? 0 : 0;
  return <article className="product-card">
    <Link prefetch={true} className="product-card-link" href={`/producto/${encodeURIComponent(product.slug)}`} aria-label={`Ver detalles de ${product.name}`} onClick={() => rememberProductForNavigation(product)}>
    <div className="product-art product-art-image" style={{ backgroundImage: `url("${product.image_url.replaceAll('"', '')}")` }} role="img" aria-label={product.name}>
      {isOfferProduct(product) && <div className="product-sale-flags"><span className="product-sale-tag">OFERTA</span></div>}
      <span className="product-stock">{product.stock > 0 ? `${product.stock} disponibles` : "Agotado"}</span>
    </div>
    </Link>
    <div className="product-info"><Link prefetch={true} className="product-card-link" href={`/producto/${encodeURIComponent(product.slug)}`} onClick={() => rememberProductForNavigation(product)}><p>{product.set_name || "Pokémon TCG · English"}</p><h3>{product.name}</h3>{product.description && <p className="product-description">{product.description}</p>}</Link>
      <div className="product-bottom"><div className="product-card-pricing"><strong>${Number(product.price_mxn).toLocaleString("es-MX")} MXN</strong>{hasPriceReduction(product) && <><del className="product-old-price">${Number(product.compare_at_price_mxn).toLocaleString("es-MX")}</del><span className="product-card-discount">{discountPercent(product)}% OFF</span></>}</div><button type="button" aria-label={`Agregar ${product.name} al carrito`} title={quantityInCart ? `${quantityInCart} en tu carrito` : "Agregar al carrito"} disabled={!hydrated || product.stock < 1 || quantityInCart >= Math.min(99, product.stock)} onClick={() => { addItem(product); onAdded(product.name); }}><CartAddIcon /><span>{product.stock < 1 ? "Agotado" : quantityInCart >= Math.min(99, product.stock) ? "En carrito" : "Agregar"}</span></button></div>
    </div>
  </article>;
}


function discountPercent(product: Product) { return Math.round((1 - Number(product.price_mxn) / Number(product.compare_at_price_mxn)) * 100); }
function CartAddIcon() {
  return <svg className="add-cart-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="19" r="1.25" fill="currentColor"/><circle cx="18" cy="19" r="1.25" fill="currentColor"/><path d="M13 6v5m-2.5-2.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

