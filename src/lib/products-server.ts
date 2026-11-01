import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import type { Product } from "@/lib/products";

const productFields = "*";
const legacyProductFields = "id, slug, name, category, set_name, description, language, price_mxn, stock, image_url, is_active";

function withCatalogDefaults(rows: unknown[]): Product[] {
  return rows.map((row) => ({ compare_at_price_mxn: null, is_offer: false, ...(row as Product) }));
}

export function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function readAllActiveProducts(supabase: NonNullable<ReturnType<typeof createPublicSupabaseClient>>, fields: string): Promise<unknown[] | null> {
  const rows: unknown[] = [];
  const batchSize = 500;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select(fields)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(rows.length, rows.length + batchSize - 1);
    if (error) return null;
    if (!data?.length) return rows;
    rows.push(...data);
  }
}

export async function getActiveProducts(): Promise<Product[] | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  const rows = await readAllActiveProducts(supabase, productFields);
  if (rows) return withCatalogDefaults(rows);
  const legacyRows = await readAllActiveProducts(supabase, legacyProductFields);
  return legacyRows ? withCatalogDefaults(legacyRows) : null;
}

export async function getActiveProductBySlug(slug: string): Promise<Product | null> {
  const products = await getActiveProducts();
  return products?.find((product) => product.slug === slug) ?? null;
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const products = await getActiveProducts();
  return products?.filter((item) => item.category === product.category && item.id !== product.id).slice(0, limit) ?? [];
}
