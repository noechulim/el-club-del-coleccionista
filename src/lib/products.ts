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
  stock: number;
  is_preorder?: boolean;
  preorder_release_date?: string | null;
  image_url: string;
  image_urls?: string[];
  product_type?: string;
  specifications?: string;
  is_featured?: boolean;
  is_active: boolean;
};

export const categoryLabels: Record<ProductCategory, string> = {
  sealed: "Sellado",
  single: "Carta individual",
  graded: "Carta calificada",
  accessory: "Accesorio",
};
