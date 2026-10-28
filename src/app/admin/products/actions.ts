"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productTypes } from "@/lib/catalog";
import type { ProductCategory } from "@/lib/products";

export type ProductActionState = { error?: string; message?: string };
const categories: ProductCategory[] = ["sealed", "single", "graded", "accessory"];
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Inicia sesión para continuar." } as const;
  const { data: isAdmin, error } = await supabase.rpc("is_store_admin");
  if (error || !isAdmin) return { error: "Tu cuenta no tiene permisos de administración." } as const;
  return { supabase } as const;
}

export type MoonProductPreview = {
  url: string;
  name: string;
  sourceCategory: string;
  setName: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string;
  category: ProductCategory;
  productType: string;
};

export type MoonImportResult = { imported: number; skipped: number; errors: string[] };

function normalizeMoonProductUrl(value: string): string | null {
  if (value.length > 500) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.hostname !== "moon-tcg.com" || !/^\/producto\/[a-z0-9-]+\/?$/i.test(url.pathname)) return null;
    return `https://moon-tcg.com${url.pathname.replace(/\/$/, "")}`;
  } catch { return null; }
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code))).replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function plainText(value: unknown, limit: number) {
  return decodeHtml(String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\\u003c/gi, "<").replace(/\\u003e/gi, ">").replace(/\s+/g, " ").trim()).slice(0, limit);
}

function metaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*(?:property|name)=["']${escaped}["'])[^>]*>`, "i"))?.[0];
  return tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1] ?? "";
}

function walkJsonLd(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(walkJsonLd);
  const record = value as Record<string, unknown>;
  return [record, ...walkJsonLd(record["@graph"])];
}

async function readMoonProduct(rawUrl: string): Promise<MoonProductPreview> {
  const url = normalizeMoonProductUrl(rawUrl);
  if (!url) throw new Error("Usa un enlace HTTPS de un producto de moon-tcg.com, con formato /producto/…");
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: "error", headers: { "User-Agent": "Mozilla/5.0 (compatible; ClubCatalogImporter/1.0)" } });
  if (!response.ok) throw new Error(`Moon TCG respondió con error (${response.status}).`);
  const html = (await response.text()).slice(0, 2_000_000);
  const jsonScripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const jsonItems = jsonScripts.flatMap((match) => {
    try { return walkJsonLd(JSON.parse(decodeHtml(match[1]))); } catch { return []; }
  });
  const product = jsonItems.find((item) => {
    const type = item["@type"];
    return type === "Product" || (Array.isArray(type) && type.includes("Product"));
  }) ?? {};
  const offerValue = product.offers && typeof product.offers === "object" ? (Array.isArray(product.offers) ? product.offers[0] : product.offers) as Record<string, unknown> : {};
  const name = plainText(product.name || metaContent(html, "og:title") || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1], 120).replace(/\s*[|–-]\s*Moon TCG$/i, "");
  const description = plainText(product.description || metaContent(html, "og:description") || metaContent(html, "description"), 2000);
  const rawImage = Array.isArray(product.image) ? product.image[0] : product.image;
  const imageUrlValue = typeof rawImage === "string" ? rawImage : rawImage && typeof rawImage === "object" ? (rawImage as Record<string, unknown>).url : "";
  const imageCandidate = String(imageUrlValue || metaContent(html, "og:image"));
  let imageUrl = "";
  try {
    const parsed = new URL(imageCandidate, url);
    if (parsed.protocol === "https:" && parsed.hostname === "moon-tcg.com" && parsed.pathname.startsWith("/api/public/product-image")) imageUrl = parsed.toString();
  } catch { /* No se acepta imagen externa o URL mal formada. */ }
  const rawPrice = Number(offerValue.price ?? offerValue.lowPrice ?? metaContent(html, "product:price:amount"));
  const bodyText = plainText(html, 2_000_000);
  const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : Number(bodyText.match(/\$\s*([\d,]+(?:\.\d{1,2})?)\s*MXN/i)?.[1]?.replace(/,/g, ""));
  const compareText = bodyText.match(/\$\s*([\d,]+(?:\.\d{1,2})?)\s*MXN[^$]{0,80}\$\s*([\d,]+(?:\.\d{1,2})?)\s*MXN/i);
  const compareAtPrice = compareText ? Number(compareText[2].replace(/,/g, "")) : null;
  const breadcrumbItems = jsonItems.filter((item) => item["@type"] === "BreadcrumbList").flatMap((item) => {
    const entries = item.itemListElement;
    return Array.isArray(entries) ? entries.map((entry) => entry && typeof entry === "object" ? plainText((entry as Record<string, unknown>).name || ((entry as Record<string, unknown>).item as Record<string, unknown> | undefined)?.name, 120) : "") : [];
  });
  const usefulBreadcrumbs = breadcrumbItems.filter((item) => item && !/^(inicio|home|catálogo|pokemon tcg)$/i.test(item));
  const lastBreadcrumb = usefulBreadcrumbs.at(-1);
  const categoryBreadcrumb = lastBreadcrumb?.toLocaleLowerCase("es-MX") === name.toLocaleLowerCase("es-MX") ? usefulBreadcrumbs.at(-2) : lastBreadcrumb;
  const sourceCategory = plainText(categoryBreadcrumb || product.category, 100);
  const expansionAnchor = [...html.matchAll(/<a\b[^>]*href=["'](?:https:\/\/moon-tcg\.com)?\/expansiones\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => plainText(match[1], 120))
    .find((value) => value && !/^(ver colección|explorar ahora)$/i.test(value));
  const bodyExpansion = bodyText.match(/English\s+([\p{L}\p{N}][\p{L}\p{N}\s&—–.'-]{1,80}?)(?=\s+#|\s+\$)/u)?.[1]?.trim();
  const setName = expansionAnchor || bodyExpansion || "";
  const sourceLabel = sourceCategory.toLocaleLowerCase("es-MX");
  const inferred = `${sourceCategory} ${name} ${breadcrumbItems.join(" ")}`.toLocaleLowerCase("es-MX");
  const categorySignal = `${sourceLabel} ${name.toLocaleLowerCase("es-MX")} ${breadcrumbItems.join(" ").toLocaleLowerCase("es-MX")}`;
  const category: ProductCategory = /graded|calificada|psa|cgc|beckett/.test(categorySignal) ? "graded" : /single|singles|carta individual|carta suelta/.test(categorySignal) ? "single" : /accesorio|accessor|sleeve|toploader|binder|album/.test(categorySignal) ? "accessory" : "sealed";
  const sourceType = sourceLabel.replace(/\s+/g, " ").replace(/s$/, "");
  const typeAliases: Record<string, string> = {
    "booster box": "booster-box", "elite trainer box": "elite-trainer-box", "booster bundle": "booster-bundle",
    "collection box": "collection-box", "special collection": "special-collection", "premium collection": "special-collection",
    "blister pack": "blister-pack", "booster pack": "booster-pack",
  };
  const productType = category === "sealed"
    ? typeAliases[sourceType] ?? Object.keys(productTypes).find((type) => inferred.includes(productTypes[type as keyof typeof productTypes].toLocaleLowerCase("es-MX")) || inferred.includes(type)) ?? ""
    : "";
  if (!name || !Number.isFinite(price) || !imageUrl) throw new Error("No pude leer nombre, precio o imagen de esta ficha. Revisa que el enlace sea público y tenga esos datos visibles.");
  return { url, name, sourceCategory, setName, description, price, compareAtPrice: compareAtPrice && compareAtPrice > price ? compareAtPrice : null, imageUrl, category, productType };
}

function validatedMoonUrls(values: string[]) {
  if (!Array.isArray(values) || values.length < 1 || values.length > 20) return { urls: [], error: "Agrega entre 1 y 20 enlaces de productos." };
  const normalized = values.map(normalizeMoonProductUrl);
  if (normalized.some((url) => !url)) return { urls: [], error: "Hay un enlace no válido. Usa enlaces HTTPS de productos de moon-tcg.com." };
  const urls = [...new Set(normalized.filter((url): url is string => Boolean(url)))];
  return { urls };
}

export async function previewMoonProducts(values: string[]): Promise<{ products: MoonProductPreview[]; errors: string[]; error?: string }> {
  const access = await requireAdmin();
  if ("error" in access) return { products: [], errors: [], error: access.error };
  const checked = validatedMoonUrls(values);
  if (checked.error) return { products: [], errors: [], error: checked.error };
  const products: MoonProductPreview[] = [];
  const errors: string[] = [];
  for (const url of checked.urls) {
    try { products.push(await readMoonProduct(url)); }
    catch (error) { errors.push(`${url}: ${error instanceof Error ? error.message : "No se pudo leer el producto."}`); }
  }
  return { products, errors };
}

export async function importMoonProducts(values: string[]): Promise<MoonImportResult & { error?: string }> {
  const access = await requireAdmin();
  if ("error" in access) return { imported: 0, skipped: 0, errors: [], error: access.error };
  const checked = validatedMoonUrls(values);
  if (checked.error) return { imported: 0, skipped: 0, errors: [], error: checked.error };
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const url of checked.urls) {
    let storagePath: string | null = null;
    try {
      const product = await readMoonProduct(url);
      const duplicate = await access.supabase.from("products").select("id").eq("name", product.name).limit(1).maybeSingle();
      if (duplicate.error) throw new Error("No se pudo comprobar si ya existe en tu catálogo.");
      if (duplicate.data) { skipped++; continue; }
      const imageResponse = await fetch(product.imageUrl, { signal: AbortSignal.timeout(12000), redirect: "error" });
      const contentType = imageResponse.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
      if (!imageResponse.ok || !["image/jpeg", "image/png", "image/webp"].includes(contentType || "")) throw new Error("La imagen no está disponible en un formato compatible.");
      const reader = imageResponse.body?.getReader();
      if (!reader) throw new Error("No se pudo leer la imagen del producto.");
      const chunks: Uint8Array[] = [];
      let imageBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        imageBytes += value.byteLength;
        if (imageBytes > 5 * 1024 * 1024) { await reader.cancel(); throw new Error("La imagen supera el límite de 5 MB."); }
        chunks.push(value);
      }
      if (imageBytes === 0) throw new Error("La imagen está vacía.");
      const image = Buffer.allocUnsafe(imageBytes);
      let offset = 0;
      for (const chunk of chunks) { image.set(chunk, offset); offset += chunk.byteLength; }
      const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
      storagePath = `moon-tcg/${randomUUID()}.${extension}`;
      const upload = await access.supabase.storage.from("product-images").upload(storagePath, image, { contentType, upsert: false });
      if (upload.error) throw new Error("No se pudo guardar la imagen. Revisa la configuración de Storage en Supabase.");
      const imageUrl = access.supabase.storage.from("product-images").getPublicUrl(storagePath).data.publicUrl;
      const slugBase = product.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "producto";
      const result = await access.supabase.from("products").insert({
        slug: `${slugBase}-${randomUUID().slice(0, 8)}`, name: product.name, category: product.category,
        product_type: product.productType, set_name: product.setName, description: product.description,
        language: "English", price_mxn: product.price,
        compare_at_price_mxn: product.compareAtPrice, stock: 0, is_preorder: false,
        preorder_release_date: null, image_url: imageUrl, image_urls: [], specifications: "",
        is_featured: false, is_active: false, updated_at: new Date().toISOString(),
      }).select("id").single();
      if (result.error) throw new Error(/product_type|image_urls|specifications|is_featured/.test(result.error.message) ? "Aplica la migración 202610230004_storefront_flow.sql en Supabase." : /compare_at_price_mxn|is_preorder|preorder_release_date/.test(result.error.message) ? "Aplica la migración 202610230003_catalog_filters.sql en Supabase." : "No se pudo guardar el producto en el catálogo.");
      imported++;
      storagePath = null;
    } catch (error) {
      if (storagePath) await access.supabase.storage.from("product-images").remove([storagePath]);
      errors.push(`${url}: ${error instanceof Error ? error.message : "Error al importar."}`);
    }
  }
  if (imported) {
    revalidatePath("/", "layout");
    updateTag("products");
    revalidatePath("/admin/products");
  }
  return { imported, skipped, errors };
}

export async function saveProduct(_previous: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const access = await requireAdmin();
  if ("error" in access) return access;

  const id = text(formData, "id");
  const name = text(formData, "name");
  const category = text(formData, "category") as ProductCategory;
  const setName = text(formData, "setName");
  const description = text(formData, "description");
  const price = Number(text(formData, "price"));
  const compareAtText = text(formData, "compareAtPrice");
  const compareAtPrice = compareAtText ? Number(compareAtText) : null;
  const stock = Number(text(formData, "stock"));
  const productType = text(formData, "productType");
  const specifications = text(formData, "specifications");
  const imageUrls = [...new Set(text(formData, "imageUrls").split(/\r?\n/).map((url) => url.trim()).filter(Boolean))];
  const isFeatured = text(formData, "isFeatured") === "on";
  const safeImage = (url: string) => /^\/(?!\/)/.test(url) || /^https:\/\/[^\s]+$/i.test(url);
  if (productType && (category !== "sealed" || !(productType in productTypes))) return { error: "Selecciona un formato válido para el producto sellado." };
  if (specifications.length > 4000 || imageUrls.length > 8 || imageUrls.some((url) => url.length > 2048 || !safeImage(url))) return { error: "Revisa las especificaciones y la galería (máximo 8 URLs HTTPS o rutas locales)." };
  const imageUrl = text(formData, "imageUrl") || "/pokemon-card.jpg";
  const isActive = text(formData, "isActive") === "on";

  if (!name || name.length > 120) return { error: "El nombre es obligatorio (máximo 120 caracteres)." };
  if (!categories.includes(category)) return { error: "Selecciona una categoría válida." };
  if (!Number.isFinite(price) || price < 0 || price > 99999999) return { error: "Escribe un precio válido en MXN." };
  if (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice <= price || compareAtPrice > 99999999)) return { error: "El precio anterior debe ser mayor al precio actual." };
  if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) return { error: "Escribe una existencia válida." };
  if (setName.length > 120 || description.length > 2000) return { error: "La colección o descripción es demasiado larga." };
  if (imageUrl.length > 2048 || !safeImage(imageUrl)) {
    return { error: "La imagen debe ser una ruta local o una URL segura." };
  }

  const values = {
    name,
    category,
    product_type: productType,
    image_urls: imageUrls,
    specifications,
    is_featured: isFeatured,
    set_name: setName,
    description,
    language: "English" as const,
    price_mxn: price,
    compare_at_price_mxn: compareAtPrice,
    stock,
    is_preorder: false,
    preorder_release_date: null,
    image_url: imageUrl,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };

  const result = id
    ? await access.supabase.from("products").update(values).eq("id", id).select("id").maybeSingle()
    : await access.supabase.from("products").insert({
        ...values,
        slug: `${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "producto"}-${randomUUID().slice(0, 8)}`,
      }).select("id").single();

  if (result.error && /product_type|image_urls|specifications|is_featured/.test(result.error.message)) return { error: "Aplica la migración 202610230004_storefront_flow.sql para guardar la galería y los formatos." };
  if (result.error?.message.includes("compare_at_price_mxn") || result.error?.message.includes("is_preorder") || result.error?.message.includes("preorder_release_date")) return { error: "Aplica la migración 202610230003_catalog_filters.sql en Supabase para guardar ofertas y datos del catálogo." };
  if (result.error || !result.data) return { error: "No se pudo guardar. Revisa la configuración de Supabase e inténtalo de nuevo." };
  revalidatePath("/", "layout");
  updateTag("products");
  revalidatePath("/admin/products");
  return { message: isActive ? "Producto guardado y visible en el catálogo." : "Producto guardado como borrador." };
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const access = await requireAdmin();
  if ("error" in access) return;
  const id = text(formData, "id");
  if (!id) return;
  await access.supabase.from("products").delete().eq("id", id);
  revalidatePath("/", "layout");
  updateTag("products");
  revalidatePath("/admin/products");
}
