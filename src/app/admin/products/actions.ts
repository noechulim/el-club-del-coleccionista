"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
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
  const isPreorder = text(formData, "isPreorder") === "on";
  const preorderReleaseDate = text(formData, "preorderReleaseDate") || null;
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
  if (!isPreorder && preorderReleaseDate) return { error: "Activa la preventa para agregar su fecha estimada." };
  if (preorderReleaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(preorderReleaseDate)) return { error: "La fecha de lanzamiento no es válida." };
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
    is_preorder: isPreorder,
    preorder_release_date: preorderReleaseDate,
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
  if (result.error?.message.includes("compare_at_price_mxn") || result.error?.message.includes("is_preorder") || result.error?.message.includes("preorder_release_date")) return { error: "Aplica la migración 202610230003_catalog_filters.sql en Supabase para guardar ofertas y preventas." };
  if (result.error || !result.data) return { error: "No se pudo guardar. Revisa la configuración de Supabase e inténtalo de nuevo." };
  revalidatePath("/", "layout");
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
  revalidatePath("/admin/products");
}
