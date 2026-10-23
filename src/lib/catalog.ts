import type { Product } from "./products";

export const productTypes = {
  "booster-box": "Booster Box", "elite-trainer-box": "Elite Trainer Box",
  "booster-bundle": "Booster Bundle", "collection-box": "Collection Box",
  "blister-pack": "Blister Pack", "booster-pack": "Booster Pack", "special-collection": "Special Collection",
} as const;
export const catalogCategories = [
  { slug: "sellado", label: "Productos sellados", category: "sealed", type: "" },
  ...Object.entries(productTypes).map(([slug, label]) => ({ slug, label, category: "sealed", type: slug })),
  { slug: "cartas-sueltas", label: "Cartas sueltas", category: "single", type: "" },
  { slug: "cartas-calificadas", label: "Cartas calificadas", category: "graded", type: "" },
  { slug: "accesorios", label: "Accesorios", category: "accessory", type: "" },
];
export type CatalogFilters = { category: string; type: string; collection: string; minPrice: string; maxPrice: string; available: boolean; preorder: boolean; offer: boolean };
export const emptyFilters: CatalogFilters = { category: "", type: "", collection: "", minPrice: "", maxPrice: "", available: false, preorder: false, offer: false };
export const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX").trim();
export function filterProducts(products: Product[], filters: CatalogFilters, query: string, sort: string) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const result = products.filter((product) => {
    const text = normalizeSearch(`${product.name} ${product.set_name} ${product.description}`);
    return terms.every((term) => text.includes(term))
      && (!filters.category || product.category === filters.category)
      && (!filters.type || product.product_type === filters.type)
      && (!filters.collection || product.set_name === filters.collection)
      && (filters.minPrice === "" || Number(product.price_mxn) >= Number(filters.minPrice))
      && (filters.maxPrice === "" || Number(product.price_mxn) <= Number(filters.maxPrice))
      && (!filters.available || product.stock > 0)
      && (!filters.preorder || product.is_preorder)
      && (!filters.offer || Number(product.compare_at_price_mxn) > Number(product.price_mxn));
  });
  if (sort === "price-asc") result.sort((a, b) => a.price_mxn - b.price_mxn);
  if (sort === "price-desc") result.sort((a, b) => b.price_mxn - a.price_mxn);
  if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name, "es-MX"));
  if (sort === "discount") result.sort((a, b) => (1 - b.price_mxn / (b.compare_at_price_mxn || b.price_mxn || 1)) - (1 - a.price_mxn / (a.compare_at_price_mxn || a.price_mxn || 1)));
  return result;
}
export function categoryHref(category: string) { return `/categorias/${catalogCategories.find((item) => item.category === category && !item.type)?.slug ?? "sellado"}`; }
export function collectionHref(name: string) { return `/expansiones/${encodeURIComponent(name)}`; }
