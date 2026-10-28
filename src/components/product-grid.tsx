"use client";
import { StoreSelect } from "@/components/store-select";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/products";
import { categoryLabels } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { useCartToast } from "@/components/cart-toast-provider";
import { emptyFilters, filterProducts, productTypes, type CatalogFilters } from "@/lib/catalog";

export function ProductGrid({ products, showFilters = true, scope = {} }: { products: Product[]; showFilters?: boolean; scope?: Partial<CatalogFilters> }) {
  const params = useSearchParams();
  const { ready } = useCart();
  const { announceAdded } = useCartToast();
  const query = showFilters ? params.get("q") || "" : "";
  const filters = { ...emptyFilters };
  if (showFilters) {
    for (const key of ["category", "type", "collection", "minPrice", "maxPrice"] as const) filters[key] = params.get(key) || "";
    for (const key of ["available", "offer"] as const) filters[key] = params.get(key) === "1";
  }
  Object.assign(filters, scope);
  const sort = params.get("sort") || "recent";
  const visible = filterProducts(products, filters, query, showFilters ? sort : "recent");
  const pages = Math.max(1, Math.ceil(visible.length / 12));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(params.get("page")) || 1)));
  const shown = showFilters ? visible.slice((page - 1) * 12, page * 12) : visible;
  const collections = [...new Set(products.map((p) => p.set_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es-MX"));
  const selectedCategory = filters.type ? `type:${filters.type}` : filters.category ? `category:${filters.category}` : "";
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
  return <section id="catalogo" aria-label="Productos">
    {showFilters ? <div className="catalog-browser">
      <div className="catalog-control-deck">
        <div className="catalog-deck-heading"><div><span className="catalog-deck-kicker">BÚSQUEDA DEL CLUB</span><h2>Encuentra tu próxima pieza</h2></div><button className="catalog-sidebar-clear" type="button" onClick={clear}>Restablecer filtros</button></div>
        <div className="catalog-local-search"><label htmlFor="catalog-query">Buscar en el catálogo</label><div><span className="search-icon" aria-hidden="true" /><input id="catalog-query" type="search" autoComplete="off" value={query} placeholder="Nombre, expansión o producto..." onChange={(e) => update({ q: e.target.value })} />{query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => update({ q: "" })}>×</button>}</div></div>
        <div className="catalog-control-grid">
          <div className="catalog-control-field"><label>Expansión</label><StoreSelect label="Expansión" disabled={Boolean(scope.collection)} value={filters.collection} onChange={(e) => update({ collection: e.target.value })}><option value="">Todas las expansiones</option>{collections.map((collection) => <option key={collection} value={collection}>{collection}</option>)}</StoreSelect></div>
          <div className="catalog-control-field"><label>Categoría</label><StoreSelect label="Categoría" disabled={Boolean(scope.category) || Boolean(scope.type)} value={selectedCategory} onChange={(e) => { const value = e.target.value; if (value.startsWith("type:")) update({ category: "sealed", type: value.slice(5) }); else if (value.startsWith("category:")) update({ category: value.slice(9), type: "" }); else update({ category: "", type: "" }); }}><option value="">Todas</option><optgroup label="Tipo de producto">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={`category:${value}`}>{label}</option>)}</optgroup><optgroup label="Formato sellado">{Object.entries(productTypes).map(([value, label]) => <option key={value} value={`type:${value}`}>{label}</option>)}</optgroup></StoreSelect></div>
          <fieldset className="catalog-price-range"><legend>Rango de precio (MXN)</legend><label className="sr-only" htmlFor="catalog-min-price">Precio mínimo</label><input id="catalog-min-price" type="number" min="0" step="0.01" placeholder="Mínimo" value={filters.minPrice} onChange={(e) => update({ minPrice: e.target.value })} /><span aria-hidden="true">—</span><label className="sr-only" htmlFor="catalog-max-price">Precio máximo</label><input id="catalog-max-price" type="number" min="0" step="0.01" placeholder="Máximo" value={filters.maxPrice} onChange={(e) => update({ maxPrice: e.target.value })} /></fieldset>
        </div>
        <div className="catalog-deck-footer"><div className="catalog-quick-filters"><span className="catalog-quick-label">Mostrar</span><label className={filters.available ? "is-active" : ""}><input type="checkbox" checked={filters.available} onChange={(e) => update({ available: e.target.checked })} />Solo disponibles</label><label className={filters.offer ? "is-active" : ""}><input type="checkbox" disabled={scope.offer === true} checked={filters.offer} onChange={(e) => update({ offer: e.target.checked })} />En oferta</label><span className="catalog-language-pill"><span aria-hidden="true">✦</span> Pokémon TCG · English</span></div></div>
      </div>
      <div className="catalog-results-toolbar"><p className="catalog-results-count" role="status"><strong>{visible.length}</strong> {visible.length === 1 ? "pieza encontrada" : "piezas encontradas"}{query ? ' para “' + query + '”' : ""}</p><label>Ordenar por<StoreSelect label="Ordenar productos" value={sort} onChange={(e) => update({ sort: e.target.value })}><option value="recent">Más recientes</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option><option value="name">Nombre A–Z</option><option value="discount">Mayor descuento</option></StoreSelect></label></div>
      {filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice) && <p role="alert">El precio mínimo no puede superar el máximo.</p>}
      {shown.length ? <div className="product-grid">{shown.map((product) => <ProductCard key={product.id} product={product} onAdded={announceAdded} hydrated={ready} />)}</div> : <div className="catalog-empty"><h2>{query.trim() ? 'No se encontraron resultados para “' + query.trim() + '”' : "No hay productos en esta selección"}</h2><p>Prueba con otro término o explora el catálogo completo.</p><Link prefetch={true} className="text-link" href="/catalogo">Ver todo el catálogo →</Link></div>}
      {pages > 1 && <nav className="catalog-pagination" aria-label="Páginas de productos"><button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>← Anterior</button><span aria-live="polite">Página {page} de {pages}</span><button disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>Siguiente →</button></nav>}
    </div> : shown.length ? <div className="product-grid">{shown.map((product) => <ProductCard key={product.id} product={product} onAdded={announceAdded} hydrated={ready} />)}</div> : <div className="catalog-empty"><h2>{query.trim() ? 'No se encontraron resultados para “' + query.trim() + '”' : "No hay productos en esta selección"}</h2><p>Prueba con otro término o explora el catálogo completo.</p><Link prefetch={true} className="text-link" href="/catalogo">Ver todo el catálogo →</Link></div>}
  </section>;
}
function ProductCard({ product, onAdded, hydrated }: { product: Product; onAdded: (name: string) => void; hydrated: boolean }) {
  const { addItem, items } = useCart();
  const quantityInCart = hydrated ? items.find((item) => item.product.id === product.id)?.quantity ?? 0 : 0;
  return <article className="product-card">
    <Link prefetch={true} className="product-card-link" href={`/producto/${encodeURIComponent(product.slug)}`} aria-label={`Ver detalles de ${product.name}`}>
    <div className="product-art product-art-image" style={{ backgroundImage: `url("${product.image_url.replaceAll('"', '')}")` }} role="img" aria-label={product.name}>
      <span className="product-tag">{categoryLabels[product.category]}</span>
      {Number(product.compare_at_price_mxn) > Number(product.price_mxn) && <span className="product-sale-tag">{discountPercent(product)}% OFF</span>}
      <span className="product-stock">{product.stock > 0 ? `${product.stock} disponibles` : "Agotado"}</span>
    </div>
    </Link>
    <div className="product-info"><Link prefetch={true} className="product-card-link" href={`/producto/${encodeURIComponent(product.slug)}`}><p>{product.set_name || "Pokémon TCG · English"}</p><h3>{product.name}</h3>{product.description && <p className="product-description">{product.description}</p>}</Link>
      <div className="product-bottom"><strong>${Number(product.price_mxn).toLocaleString("es-MX")} MXN{Number(product.compare_at_price_mxn) > Number(product.price_mxn) && <del className="product-old-price">${Number(product.compare_at_price_mxn).toLocaleString("es-MX")}</del>}</strong><button type="button" aria-label={`Agregar ${product.name} al carrito`} title={quantityInCart ? `${quantityInCart} en tu carrito` : "Agregar al carrito"} disabled={!hydrated || product.stock < 1 || quantityInCart >= Math.min(99, product.stock)} onClick={() => { addItem(product); onAdded(product.name); }}><CartAddIcon /><span>{product.stock < 1 ? "Agotado" : quantityInCart >= Math.min(99, product.stock) ? "En carrito" : "Agregar"}</span></button></div>
    </div>
  </article>;
}


function discountPercent(product: Product) { return Math.round((1 - Number(product.price_mxn) / Number(product.compare_at_price_mxn)) * 100); }
function CartAddIcon() {
  return <svg className="add-cart-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="19" r="1.25" fill="currentColor"/><circle cx="18" cy="19" r="1.25" fill="currentColor"/><path d="M13 6v5m-2.5-2.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

