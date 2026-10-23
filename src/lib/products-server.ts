import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/products";

const productFields = "*";
const legacyProductFields = "id, slug, name, category, set_name, description, language, price_mxn, stock, image_url, is_active";

function withCatalogDefaults(rows: unknown[]): Product[] {
  return rows.map((row) => ({ compare_at_price_mxn: null, is_preorder: false, preorder_release_date: null, ...(row as Product) }));
}

export function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function getActiveProducts(): Promise<Product[] | null> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("products")
    .select(productFields)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) {
    const legacy = await supabase.from("products").select(legacyProductFields).eq("is_active", true).order("created_at", { ascending: false });
    if (legacy.error) return null;
    return withCatalogDefaults(legacy.data ?? []);
  }
  return withCatalogDefaults(data ?? []);
}

export async function getActiveProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("products")
    .select(productFields)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    const legacy = await supabase.from("products").select(legacyProductFields).eq("slug", slug).eq("is_active", true).maybeSingle();
    if (legacy.error || !legacy.data) return null;
    return withCatalogDefaults([legacy.data])[0];
  }
  if (!data) return null;
  return withCatalogDefaults([data])[0];
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select(productFields)
    .eq("is_active", true)
    .eq("category", product.category)
    .neq("id", product.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    const legacy = await supabase.from("products").select(legacyProductFields).eq("is_active", true).eq("category", product.category).neq("id", product.id).order("created_at", { ascending: false }).limit(limit);
    if (legacy.error) return [];
    return withCatalogDefaults(legacy.data ?? []);
  }
  return withCatalogDefaults(data ?? []);
}
