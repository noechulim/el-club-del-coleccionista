"use client";
import { StoreSelect } from "@/components/store-select";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import type { Product } from "@/lib/products";
import { categoryLabels } from "@/lib/products";
import { productTypes } from "@/lib/catalog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteProduct, importMoonProducts, previewMoonProducts, saveProduct, type MoonProductPreview, type ProductActionState } from "./actions";

const categoryOptions = [
  { value: "booster-box", label: "Booster Box" },
  { value: "elite-trainer-box", label: "Elite Trainer Box" },
  { value: "booster-bundle", label: "Booster Bundle" },
  { value: "collection-box", label: "Collection Boxes" },
  { value: "blister-pack", label: "Blister Packs" },
  { value: "booster-pack", label: "Booster Packs" },
  { value: "special-collection", label: "Special Collections" },
] as const;

function categoryLabel(category: Product["category"], productType?: string | null) {
  return category === "sealed" && productType && productType in productTypes
    ? categoryOptions.find((option) => option.value === productType)?.label ?? productTypes[productType as keyof typeof productTypes]
    : categoryLabels[category];
}

type Draft = { productType: string; imageUrls: string; specifications: string; isFeatured: boolean; isOffer: boolean; id: string; name: string; category: Product["category"]; setName: string; description: string; price: string; compareAtPrice: string; stock: string; imageUrl: string; isActive: boolean };
const blank: Draft = { productType: "", imageUrls: "", specifications: "", isFeatured: false, isOffer: false, id: "", name: "", category: "sealed", setName: "", description: "", price: "", compareAtPrice: "", stock: "0", imageUrl: "/pokemon-card.jpg", isActive: false };

function NumberField({ id, name, label, value, onChange, step, max, required = false, placeholder }: { id: string; name: string; label: string; value: string; onChange: (value: string) => void; step: number; max: number; required?: boolean; placeholder?: string }) {
  const current = Number(value || 0);
  function adjust(direction: 1 | -1) {
    const next = Math.min(max, Math.max(0, Math.round((current + direction * step) * 100) / 100));
    onChange(String(next));
  }
  return <div className="admin-number-control"><label htmlFor={id}>{label}</label><div className="admin-number-field"><input id={id} name={name} type="number" min="0" max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} /><div className="admin-number-steps"><button type="button" aria-label={`Aumentar ${label.toLowerCase()}`} disabled={current >= max} onClick={() => adjust(1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 10 4-4 4 4" /></svg></button><button type="button" aria-label={`Disminuir ${label.toLowerCase()}`} disabled={!value || current <= 0} onClick={() => adjust(-1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg></button></div></div></div>;
}

export function ProductManager({ products }: { products: Product[] }) {
  const router = useRouter();
  const editorRef = useRef<HTMLFormElement>(null);
  const [moonUrls, setMoonUrls] = useState("");
  const [moonPreviews, setMoonPreviews] = useState<MoonProductPreview[]>([]);
  const [moonErrors, setMoonErrors] = useState<string[]>([]);
  const [moonWarnings, setMoonWarnings] = useState<string[]>([]);
  const [moonMessage, setMoonMessage] = useState("");
  const [moonBusy, startMoonTransition] = useTransition();
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
    setDraft({ productType: product.product_type || "", imageUrls: (product.image_urls || []).join("\n"), specifications: product.specifications || "", isFeatured: Boolean(product.is_featured), isOffer: Boolean(product.is_offer), id: product.id, name: product.name, category: product.category === "graded" ? "single" : product.category, setName: product.set_name, description: product.description, price: String(product.price_mxn), compareAtPrice: product.compare_at_price_mxn ? String(product.compare_at_price_mxn) : "", stock: String(product.stock), imageUrl: product.image_url, isActive: product.is_active });
    setSelectedFile(null); setGalleryFiles([]);
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      editorRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
    });
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) { setSelectedFile(event.target.files?.[0] ?? null); }

  function remove(product: Product) {
    if (!window.confirm(`¿Eliminar “${product.name}”?`)) return;
    const formData = new FormData(); formData.set("id", product.id);
    startDelete(async () => { await deleteProduct(formData); });
  }

  function previewMoon() {
    setMoonMessage("");
    setMoonPreviews([]);
    setMoonErrors([]);
    setMoonWarnings([]);
    const urls = moonUrls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
    startMoonTransition(async () => {
      const result = await previewMoonProducts(urls);
      setMoonPreviews(result.products);
      setMoonErrors(result.error ? [result.error] : result.errors);
    });
  }

  function importMoon() {
    setMoonMessage("");
    startMoonTransition(async () => {
      const result = await importMoonProducts(moonPreviews.map((product) => product.url));
      setMoonMessage(result.error || `Importados: ${result.imported}. Omitidos por duplicado: ${result.skipped}.${result.errors.length ? ` Errores: ${result.errors.length}.` : ""}${result.warnings.length ? ` Avisos: ${result.warnings.length}.` : ""}`);
      setMoonErrors(result.errors);
      setMoonWarnings(result.warnings);
      if (result.imported && !result.errors.length && !moonErrors.length) {
        setMoonPreviews([]);
        setMoonUrls("");
        router.refresh();
      }
    });
  }

  return <div className="admin-content">
    <section className="moon-importer">
      <div className="admin-section-title"><div><p className="admin-eyebrow">IMPORTACIÓN</p><h2>Traer productos de Moon TCG</h2></div></div>
      <p className="moon-import-help">Pega enlaces de fichas individuales, uno por línea (máximo 5 por lote). Se tomarán la categoría, expansión, existencia y hasta dos imágenes. Al importar se leerá de nuevo la existencia y el producto quedará visible en la tienda. Si Moon TCG no muestra una cifra de stock verificable, se guardará con 0 unidades para revisarlo. “Destacado” se activa manualmente.</p>
      <label className="moon-import-label">Enlaces de producto<textarea value={moonUrls} onChange={(event) => setMoonUrls(event.target.value)} rows={4} placeholder="https://moon-tcg.com/producto/nombre-del-producto" /></label>
      <div className="moon-import-actions"><button className="admin-secondary" type="button" onClick={previewMoon} disabled={moonBusy || !moonUrls.trim()}>{moonBusy ? "Consultando…" : "Revisar productos"}</button>{moonPreviews.length > 0 && <button className="admin-primary" type="button" onClick={importMoon} disabled={moonBusy}>{moonBusy ? "Importando…" : `Importar ${moonPreviews.length} producto${moonPreviews.length === 1 ? "" : "s"}`}</button>}</div>
      {moonMessage && <p className="form-notice" role="status">{moonMessage}</p>}
      {moonErrors.length > 0 && <ul className="moon-import-errors" role="alert">{moonErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
      {moonWarnings.length > 0 && <ul className="moon-import-warnings" role="status">{moonWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      {moonPreviews.length > 0 && <div className="moon-preview-grid">{moonPreviews.map((product) => <article className="moon-preview" key={product.url}><div className="moon-preview-image" style={{ backgroundImage: `url("${(product.imageUrl || "/pokemon-card.jpg").replaceAll('"', "")}")` }} role="img" aria-label={product.name} /><div><strong>{product.name}</strong><p>Categoría Moon: {product.sourceCategory || "Sin identificar"} · {categoryLabel(product.category, product.productType)}</p><p>Expansión: {product.setName || "Sin identificar"}</p><p className="moon-preview-stock">Existencia en Moon al revisar: {product.sourceStock === null ? "No identificada; se guardará con 0 unidades" : `${product.sourceStock.toLocaleString("es-MX")} unidades`} · Se actualizará al importar</p><p>Imágenes encontradas: {product.imageUrls.length} de 2{!product.imageUrls.length ? " · Se usará una imagen provisional" : ""}</p><b>${product.price.toLocaleString("es-MX")} MXN{product.compareAtPrice && <del> ${product.compareAtPrice.toLocaleString("es-MX")} MXN</del>}</b><small>{product.description || "Sin descripción disponible"}</small></div></article>)}</div>}
    </section>

    <form ref={editorRef} action={formAction} className="product-editor">
      <div className="admin-section-title"><div><p className="admin-eyebrow">{draft.id ? "EDITAR" : "NUEVO"}</p><h2>{draft.id ? "Editar producto" : "Agregar producto"}</h2></div>{draft.id && <button className="admin-secondary" type="button" onClick={() => { setDraft(blank); setSelectedFile(null); setGalleryFiles([]); }}>Cancelar edición</button>}</div>
      <input type="hidden" name="id" value={draft.id} /><input type="hidden" name="imageUrl" value={draft.imageUrl} />
      <input type="hidden" name="category" value={draft.category} /><input type="hidden" name="productType" value={draft.productType} />
      <div className="admin-form-grid">
        <label>Nombre del producto<input name="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required maxLength={120} placeholder="Ej. Booster Box" /></label>
        <label>Categoría<StoreSelect label="Categoría" value={draft.category === "sealed" ? draft.productType || "sealed" : draft.category} onChange={(e) => { const choice = e.target.value; setDraft({ ...draft, category: choice === "single" || choice === "accessory" ? choice : "sealed", productType: choice in productTypes ? choice : "" }); }}><option value="sealed">Sellado (general)</option>{categoryOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}<option value="single">Cartas Sueltas</option><option value="accessory">Accesorios</option></StoreSelect></label>
        <label>Expansión o colección<input name="setName" value={draft.setName} onChange={(e) => setDraft({ ...draft, setName: e.target.value })} maxLength={120} placeholder="Ej. Scarlet & Violet" /></label>
        <NumberField id="admin-price" name="price" label="Precio (MXN)" value={draft.price} onChange={(value) => setDraft((current) => ({ ...current, price: value }))} step={0.01} max={99999999} required />
        <NumberField id="admin-compare-price" name="compareAtPrice" label="Precio anterior (opcional)" value={draft.compareAtPrice} onChange={(value) => setDraft((current) => ({ ...current, compareAtPrice: value }))} step={0.01} max={99999999} placeholder="Mayor que el precio actual" />
        <label className="admin-checkbox"><input name="isOffer" type="checkbox" checked={draft.isOffer} onChange={(e) => setDraft({ ...draft, isOffer: e.target.checked })} /><span>Mostrar en Ofertas (requiere un precio anterior mayor al actual)</span></label>
        <NumberField id="admin-stock" name="stock" label="Existencias" value={draft.stock} onChange={(value) => setDraft((current) => ({ ...current, stock: value }))} step={1} max={1000000} required />
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
      {products.length === 0 ? <p className="admin-empty">Todavía no hay productos. Los productos de prueba aparecerán aquí después de ejecutar el SQL en Supabase.</p> : <div className="admin-product-grid">{products.map((product) => <article className="admin-product" key={product.id}><div className="admin-product-image" style={{ backgroundImage: `url("${product.image_url.replaceAll('"', '')}")` }} role="img" aria-label={product.name} /><div className="admin-product-detail"><div className="admin-product-title"><h3>{product.name}</h3><span className={product.is_active ? "status-active" : "status-draft"}>{product.is_active ? "Visible" : "Borrador"}</span></div><p>{categoryLabel(product.category, product.product_type)}{product.set_name ? ` · ${product.set_name}` : ""}</p><strong>${Number(product.price_mxn).toLocaleString("es-MX")} MXN{Number(product.compare_at_price_mxn) > Number(product.price_mxn) && <del className="product-old-price">${Number(product.compare_at_price_mxn).toLocaleString("es-MX")}</del>}</strong><small>{product.stock} en existencia</small><div className="admin-product-actions"><button className="admin-secondary" type="button" onClick={() => edit(product)}>Editar</button><button className="admin-danger" type="button" disabled={deleting} onClick={() => remove(product)}>Eliminar</button></div></div></article>)}</div>}
    </section>
  </div>;
}
