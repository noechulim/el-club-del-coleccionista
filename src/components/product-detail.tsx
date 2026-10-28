"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { categoryLabels } from "@/lib/products";
import { categoryHref, collectionHref, productTypes } from "@/lib/catalog";
import { useCart } from "@/lib/cart-context";
import { useCartToast } from "@/components/cart-toast-provider";
import { ProductGrid } from "@/components/product-grid";

type DetailTab = "description" | "details" | "shipping";

export function ProductDetail({ product, relatedProducts }: { product: Product; relatedProducts: Product[] }) {
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<DetailTab>("description");
  const { addItem, ready, items } = useCart();
  const images = [...new Set([product.image_url || "/pokemon-card.jpg", ...(product.image_urls || [])].filter(Boolean))];
  const [activeImage, setActiveImage] = useState(0);
  const lightbox = useRef<HTMLDialogElement>(null);
  const { announceAdded } = useCartToast();
  const router = useRouter();
  const available = Math.max(0, product.stock);
  const remaining = Math.max(0, Math.min(99, available) - (items.find((item) => item.product.id === product.id)?.quantity || 0));
  const selectedQuantity = Math.max(1, Math.min(quantity, remaining));
  const canBuy = ready && remaining > 0;

  function addToCart(goToCheckout = false) {
    if (!canBuy) return;
    addItem(product, selectedQuantity);
    announceAdded(product.name, selectedQuantity);
    if (goToCheckout) router.push("/checkout");
  }

  const isSale = Number(product.compare_at_price_mxn) > Number(product.price_mxn);
  const discount = isSale
    ? Math.round((1 - Number(product.price_mxn) / Number(product.compare_at_price_mxn)) * 100)
    : 0;

  return (
    <>
      <section className="product-detail-layout">
        {/* Galería con tamaño controlado y centrado */}
        <div className="product-gallery">
          <div className="product-frame-container">
            <button
              type="button"
              onClick={() => lightbox.current?.showModal()}
              className="product-detail-image product-zoom-trigger"
              aria-label={"Ampliar imagen de " + product.name}
            >
              <span className="product-detail-tag">{categoryLabels[product.category]}</span>
              {isSale && <span className="product-sale-badge">-{discount}%</span>}

              {/* Contenedor de la carta con proporciones reales */}
              <div
                className="product-card-canvas"
                style={{ backgroundImage: `url("${images[activeImage].replaceAll('"', '')}")` }}
                role="img"
                aria-label={product.name}
              />

              <span className="product-zoom-hint" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
                Ampliar imagen
              </span>
            </button>

            {/* Miniaturas si hay múltiples imágenes */}
            {images.length > 1 && (
              <div className="product-thumbnails">
                {images.map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    aria-label={`Ver imagen ${index + 1}`}
                    aria-pressed={activeImage === index}
                    className={`product-thumb-btn ${activeImage === index ? "is-active" : ""}`}
                    onClick={() => setActiveImage(index)}
                  >
                    <Image unoptimized src={src} alt="" width={68} height={68} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <dialog
            ref={lightbox}
            className="product-lightbox"
            aria-label={"Imagen ampliada de " + product.name}
            onClick={(event) => {
              if (event.target === event.currentTarget) lightbox.current?.close();
            }}
          >
            <form method="dialog">
              <button autoFocus className="lightbox-close-btn" aria-label="Cerrar modal">
                ✕ Cerrar
              </button>
            </form>
            <div className="lightbox-image-wrap">
              <Image unoptimized src={images[activeImage]} alt={product.name} width={1000} height={1000} />
            </div>
          </dialog>
        </div>

        {/* Panel de Compra e Información */}
        <div className="product-purchase-panel">
          <div className="product-header-block">
            <p className="product-detail-eyebrow">
              {product.set_name ? (
                <Link href={collectionHref(product.set_name)}>{product.set_name}</Link>
              ) : (
                "Pokémon TCG"
              )}
            </p>
            <h1 className="product-title">{product.name}</h1>
            <div className="product-meta-badges">
              <span className="product-pill-badge">{categoryLabels[product.category]}</span>
              <span className="product-pill-badge">{product.language}</span>
              {product.product_type && (
                <span className="product-pill-badge">
                  {productTypes[product.product_type as keyof typeof productTypes] || product.product_type}
                </span>
              )}
            </div>
          </div>

          {/* Sección de Precio */}
          <div className="product-price-section">
            <div className="product-price-row">
              <span className="product-price-amount">
                ${Number(product.price_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="product-currency-tag">MXN</span>
              {isSale && (
                <del className="product-compare-price">
                  ${Number(product.compare_at_price_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                </del>
              )}
              {isSale && <span className="product-discount-pill">Ahorras {discount}%</span>}
            </div>

            {/* Disponibilidad clara con punto verde o rojo */}
            <div className={`product-stock-status ${available === 0 ? "is-sold-out" : ""}`}>
              <span className="status-dot" aria-hidden="true" />
              <strong>
                {available > 0 ? `${available} unidades disponibles en inventario` : "Agotado por el momento"}
              </strong>
            </div>
          </div>

          {/* Selector de cantidad y botones de compra */}
          <div className="product-action-block">
            <div className="product-quantity-row">
              <span className="product-qty-label">Cantidad</span>
              <div className="quantity-control" aria-label="Cantidad a comprar">
                <button
                  type="button"
                  aria-label="Disminuir cantidad"
                  disabled={!canBuy || selectedQuantity <= 1}
                  onClick={() => setQuantity(Math.max(1, selectedQuantity - 1))}
                >
                  −
                </button>
                <output aria-live="polite">{selectedQuantity}</output>
                <button
                  type="button"
                  aria-label="Aumentar cantidad"
                  disabled={!canBuy || selectedQuantity >= remaining}
                  onClick={() => setQuantity(Math.min(remaining, selectedQuantity + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <div className="product-buy-buttons">
              <button
                type="button"
                className="product-add-button"
                disabled={!canBuy}
                onClick={() => addToCart(false)}
              >
                <CartIcon />
                <span>
                  {available < 1
                    ? "Agotado"
                    : remaining < 1
                      ? "En tu carrito"
                      : "Agregar al carrito"}
                </span>
              </button>

              <button
                type="button"
                className="product-buy-now-button"
                disabled={!canBuy}
                onClick={() => addToCart(true)}
              >
                Comprar ahora
              </button>
            </div>
          </div>

          {/* Sellos de confianza y garantías */}
          <div className="product-trust-strip">
            <div className="trust-strip-item">
              <span className="trust-icon" aria-hidden="true">
                {/* shield-check */}
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l8 3v6c0 5.25-3.5 10.15-8 11.5C7.5 21.15 4 16.25 4 11V5l8-3z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </span>
              <div>
                <strong>Autenticidad garantizada</strong>
                <p>Cartas y sellados 100% originales</p>
              </div>
            </div>
            <div className="trust-strip-item">
              <span className="trust-icon" aria-hidden="true">
                {/* package / box */}
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="21 8 21 21 3 21 3 8"/>
                  <rect x="1" y="3" width="22" height="5"/>
                  <line x1="10" y1="12" x2="14" y2="12"/>
                </svg>
              </span>
              <div>
                <strong>Empaque reforzado</strong>
                <p>Protección contra golpes y dobleces</p>
              </div>
            </div>
            <div className="trust-strip-item">
              <span className="trust-icon" aria-hidden="true">
                {/* truck */}
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </span>
              <div>
                <strong>Envíos seguros</strong>
                <p>Guía de rastreo asignada a tu orden</p>
              </div>
            </div>
          </div>

          {/* Pestañas de Especificaciones */}
          <div className="product-tabs-container">
            <div className="product-detail-tabs" role="tablist" aria-label="Detalles del producto">
              <button
                id="tab-description"
                type="button"
                role="tab"
                aria-selected={tab === "description"}
                aria-controls="panel-description"
                onClick={() => setTab("description")}
              >
                Descripción
              </button>
              <button
                id="tab-details"
                type="button"
                role="tab"
                aria-selected={tab === "details"}
                aria-controls="panel-details"
                onClick={() => setTab("details")}
              >
                Especificaciones
              </button>
              <button
                id="tab-shipping"
                type="button"
                role="tab"
                aria-selected={tab === "shipping"}
                aria-controls="panel-shipping"
                onClick={() => setTab("shipping")}
              >
                Envíos y Pago
              </button>
            </div>

            <div className="product-tab-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
              {tab === "description" && (
                <div className="tab-prose">
                  <p>{product.description || "Pieza seleccionada para coleccionistas de Pokémon TCG en excelente estado."}</p>
                </div>
              )}
              {tab === "details" && (
                <dl className="product-spec-list">
                  <div>
                    <dt>Categoría</dt>
                    <dd>
                      <Link href={categoryHref(product.category)} className="spec-link">
                        {categoryLabels[product.category]}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt>Colección / Expansión</dt>
                    <dd>{product.set_name || "General TCG"}</dd>
                  </div>
                  <div>
                    <dt>Idioma</dt>
                    <dd>{product.language}</dd>
                  </div>
                  {product.product_type && (
                    <div>
                      <dt>Formato</dt>
                      <dd>{productTypes[product.product_type as keyof typeof productTypes] || product.product_type}</dd>
                    </div>
                  )}
                  {product.specifications && (
                    <div>
                      <dt>Detalles adicionales</dt>
                      <dd>{product.specifications}</dd>
                    </div>
                  )}
                </dl>
              )}
              {tab === "shipping" && (
                <div className="tab-prose">
                  <p>
                    El costo de entrega se calcula automáticamente en el checkout con base en tu estado de residencia. Realizamos envíos a toda la República Mexicana. Una vez despachado, recibirás la paquetería y guía para seguimiento.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Productos Relacionados */}
      {relatedProducts.length > 0 && (
        <section className="product-related-section" aria-labelledby="related-products-title">
          <div className="product-related-heading">
            <div>
              <p className="product-detail-eyebrow">RECOMENDACIONES</p>
              <h2 id="related-products-title">Más para tu colección</h2>
            </div>
            <Link href="/catalogo" className="view-catalog-link">
              Ver todo el catálogo <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ProductGrid products={relatedProducts} showFilters={false} />
        </section>
      )}
    </>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="19" r="1.25" fill="currentColor" />
      <circle cx="18" cy="19" r="1.25" fill="currentColor" />
    </svg>
  );
}
