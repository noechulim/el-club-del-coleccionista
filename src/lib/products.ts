export type ProductCategory = "sealed" | "single" | "graded" | "accessory";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  set_name: string;
  description: string;
  language: "English";
  price_mxn: number;
  compare_at_price_mxn?: number | null;
  is_offer?: boolean;
  stock: number;
  image_url: string;
  image_urls?: string[];
  product_type?: string;
  specifications?: string;
  is_featured?: boolean;
  is_active: boolean;
};

export function hasPriceReduction(product: Product) {
  return product.compare_at_price_mxn != null && Number(product.compare_at_price_mxn) > Number(product.price_mxn);
}

export function isOfferProduct(product: Product) {
  return product.is_offer === true && hasPriceReduction(product);
}

export const categoryLabels: Record<ProductCategory, string> = {
  sealed: "Sellado",
  single: "Cartas sueltas",
  graded: "Cartas sueltas",
  accessory: "Accesorio",
};
