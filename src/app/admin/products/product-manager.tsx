"use client";
import { StoreSelect } from "@/components/store-select";

import { useActionState, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import type { Product } from "@/lib/products";
import { categoryLabels } from "@/lib/products";
import { productTypes } from "@/lib/catalog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteProduct, saveProduct, type ProductActionState } from "./actions";

type Draft = { productType: string; imageUrls: string; specifications: string; isFeatured: boolean; id: string; name: string; category: Product["category"]; setName: string; description: string; price: string; compareAtPrice: string; stock: string; isPreorder: boolean; preorderReleaseDate: string; imageUrl: string; isActive: boolean };
const blank: Draft = { productType: "", imageUrls: "", specifications: "", isFeatured: false, id: "", name: "", category: "sealed", setName: "", description: "", price: "", compareAtPrice: "", stock: "0", isPreorder: false, preorderReleaseDate: "", imageUrl: "/pokemon-card.jpg", isActive: false };

export function ProductManager({ products }: { products: Product[] }) {
  const [draft, setDraft] = useState<Draft>(blank);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [state, formAction, pending] = useActionState<ProductActionState, FormData>(async (_previous, formData) => {
    const existingImages = String(formData.get("imageUrls") || "").split(/\r?\n/).filter((url) => url.trim());
    if (existingImages.length + galleryFiles.length > 8) return { error: "La galería admite un máximo de 8 imágenes adicionales." };
    if (galleryFiles.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) return { error: "Cada imagen debe ser JPG, PNG o WebP y pesar como máximo 5 MB." };
    if (selectedFile) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type) || selectedFile.size > 5 * 1024 * 1024) return { error: "Elige una imagen JPG, PNG o WebP de máximo 5 MB." };
      try {
        const supabase = createSupabaseBrowserClient();
        const path = `${crypto.randomUUID()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error } = await supabase.storage.from("product-images").upload(path, selectedFile, { upsert: false, contentType: selectedFile.type });
        if (error) return { error: "No se pudo subir la imagen. Comprueba que aplicaste la configuración de Storage." };
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        formData.set("imageUrl", data.publicUrl);
      } catch {
        return { error: "No se pudo conectar con el almacenamiento de imágenes." };
      }
    }
    if (galleryFiles.length) {
      try {
        const supabase = createSupabaseBrowserClient();
        for (const file of galleryFiles) {
          const path = crypto.randomUUID() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
          if (error) return { error: "No se pudo subir una imagen de la galería. Revisa el almacenamiento e intenta de nuevo." };
          existingImages.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
        }
        formData.set("imageUrls", existingImages.join("\n"));
      } catch { return { error: "No se pudo conectar con el almacenamiento de la galería." }; }
    }
    const result = await saveProduct({}, formData);
    if (!result.error) { setDraft(blank); setSelectedFile(null); setGalleryFiles([]); }
    return result;
  }, {});
  const [deleting, startDelete] = useTransition();

  function edit(product: Product) {
    setDraft({ productType: product.product_type || "", imageUrls: (product.image_urls || []).join("\n"), specifications: product.specifications || "", isFeatured: Boolean(product.is_featured), id: product.id, name: product.name, category: product.category, setName: product.set_name, description: product.description, price: String(product.price_mxn), compareAtPrice: product.compare_at_price_mxn ? String(product.compare_at_price_mxn) : "", stock: String(product.stock), isPreorder: Boolean(product.is_preorder), preorderReleaseDate: product.preorder_release_date ?? "", imageUrl: product.image_url, isActive: product.is_active });
    setSelectedFile(null); setGalleryFiles([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) { setSelectedFile(event.target.files?.[0] ?? null); }

  function remove(product: Product) {
    if (!window.confirm(`¿Eliminar “${product.name}”?`)) return;
    const formData = new FormData(); formData.set("id", product.id);
    startDelete(async () => { await deleteProduct(formData); });
  }

  return <div className="admin-content">
    <form action={formAction} className="product-editor">
      <div className="admin-section-title"><div><p className="admin-eyebrow">{draft.id ? "EDITAR" : "NUEVO"}</p><h2>{draft.id ? "Editar producto" : "Agregar producto"}</h2></div>{draft.id && <button className="admin-secondary" type="button" onClick={() => { setDraft(blank); setSelectedFile(null); setGalleryFiles([]); }}>Cancelar edición</button>}</div>
      <input type="hidden" name="id" value={draft.id} /><input type="hidden" name="imageUrl" value={draft.imageUrl} />
      <div className="admin-form-grid">
        <label>Nombre del producto<input name="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required maxLength={120} placeholder="Ej. Booster Box" /></label>
        <label>Categoría<StoreSelect label="Categoría" name="category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Draft["category"], productType: e.target.value === "sealed" ? draft.productType : "" })}><option value="sealed">Sellado</option><option value="single">Carta individual</option><option value="graded">Carta calificada</option><option value="accessory">Accesorio</option></StoreSelect></label>
        <label>Formato<StoreSelect label="Formato" name="productType" disabled={draft.category !== "sealed"} value={draft.productType} onChange={(e) => setDraft({ ...draft, productType: e.target.value })}><option value="">Sin especificar</option>{Object.entries(productTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</StoreSelect></label>
        <label>Expansión o colección<input name="setName" value={draft.setName} onChange={(e) => setDraft({ ...draft, setName: e.target.value })} maxLength={120} placeholder="Ej. Scarlet & Violet" /></label>
        <label>Precio (MXN)<input name="price" type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} required /></label>
        <label>Precio anterior (opcional)<input name="compareAtPrice" type="number" min="0" step="0.01" value={draft.compareAtPrice} onChange={(e) => setDraft({ ...draft, compareAtPrice: e.target.value })} placeholder="Para mostrar una oferta" /></label>
        <label>Existencias<input name="stock" type="number" min="0" step="1" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} required /></label>
        <label className="admin-checkbox"><input name="isPreorder" type="checkbox" checked={draft.isPreorder} onChange={(e) => setDraft({ ...draft, isPreorder: e.target.checked, preorderReleaseDate: e.target.checked ? draft.preorderReleaseDate : "" })} /><span>Marcar como preventa</span></label>
        <label>Fecha estimada de lanzamiento<input name="preorderReleaseDate" type="date" value={draft.preorderReleaseDate} onChange={(e) => setDraft({ ...draft, preorderReleaseDate: e.target.value })} disabled={!draft.isPreorder} /></label>
        <label>Imagen del producto (JPG, PNG o WebP)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} />{selectedFile && <small>{selectedFile.name}</small>}</label>
        <label>Subir imágenes adicionales<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))} />{galleryFiles.length > 0 && <small>{galleryFiles.length} imágenes seleccionadas</small>}</label>
        <label className="admin-description">Galería: URLs de imágenes (una por línea, máximo 8)<textarea name="imageUrls" value={draft.imageUrls} onChange={(e) => setDraft({ ...draft, imageUrls: e.target.value })} rows={3} placeholder="https://…" /><small>La imagen principal se conserva al editar. Agrega aquí vistas adicionales de tu producto.</small></label>
        <label className="admin-description">Especificaciones<textarea name="specifications" value={draft.specifications} onChange={(e) => setDraft({ ...draft, specifications: e.target.value })} rows={4} maxLength={4000} placeholder="Contenido, condición, medidas o datos de graduación" /></label>
        <label className="admin-checkbox"><input name="isFeatured" type="checkbox" checked={draft.isFeatured} onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })} /><span>Destacar en el inicio</span></label>
        <label className="admin-description">Descripción<textarea name="description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} maxLength={2000} /></label>
        <label className="admin-checkbox"><input name="isActive" type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} /><span>Visible en la tienda</span></label>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.message && <p className="form-notice" role="status">{state.message}</p>}
      <button className="admin-primary" disabled={pending}>{pending ? "Guardando…" : draft.id ? "Guardar cambios" : "Agregar producto"}</button>
    </form>

    <section className="admin-product-list"><div className="admin-section-title"><div><p className="admin-eyebrow">CATÁLOGO</p><h2>Productos <span>({products.length})</span></h2></div></div>
      {products.length === 0 ? <p className="admin-empty">Todavía no hay productos. Los productos de prueba aparecerán aquí después de ejecutar el SQL en Supabase.</p> : <div className="admin-product-grid">{products.map((product) => <article className="admin-product" key={product.id}><div className="admin-product-image" style={{ backgroundImage: `url("${product.image_url.replaceAll('"', '')}")` }} role="img" aria-label={product.name} /><div className="admin-product-detail"><div className="admin-product-title"><h3>{product.name}</h3><span className={product.is_active ? "status-active" : "status-draft"}>{product.is_active ? "Visible" : "Borrador"}</span></div><p>{categoryLabels[product.category]}{product.set_name ? ` · ${product.set_name}` : ""}</p><strong>${Number(product.price_mxn).toLocaleString("es-MX")} MXN{Number(product.compare_at_price_mxn) > Number(product.price_mxn) && <del className="product-old-price">${Number(product.compare_at_price_mxn).toLocaleString("es-MX")}</del>}</strong><small>{product.stock} en existencia{product.is_preorder ? " · Preventa" : ""}{product.is_preorder && product.preorder_release_date ? ` · Lanzamiento estimado ${product.preorder_release_date}` : ""}</small><div className="admin-product-actions"><button className="admin-secondary" type="button" onClick={() => edit(product)}>Editar</button><button className="admin-danger" type="button" disabled={deleting} onClick={() => remove(product)}>Eliminar</button></div></div></article>)}</div>}
    </section>
  </div>;
}
