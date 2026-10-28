"use client";

import Link from "next/link";
import { PurchaseSteps } from "@/components/purchase-steps";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";

const money = (amount: number) => `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

export function CartView() {
  const { items, subtotal, ready, setQuantity, removeItem } = useCart();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { queueMicrotask(() => setHydrated(true)); }, []);

  if (!hydrated || !ready) return null;
  if (!items.length) return <section className="cart-empty"><div className="cart-empty-mark" aria-hidden="true">✦</div><h2>Tu carrito está vacío</h2><p>Explora el catálogo y agrega las piezas que quieras.</p><Link className="cart-primary" href="/catalogo">Explorar catálogo</Link></section>;

  return <><PurchaseSteps step="cart" /><div className="cart-layout">
    <section className="cart-items" aria-label="Productos en el carrito">
      {items.map(({ product, quantity }) => <article className="cart-item" key={product.id}>
        <div className="cart-item-image" style={{ backgroundImage: `url("${product.image_url.replaceAll('"', '')}")` }} role="img" aria-label={product.name} />
        <div className="cart-item-info"><p>{product.set_name || "Pokémon TCG"}</p><div className="cart-item-title"><h2><Link href={`/producto/${encodeURIComponent(product.slug)}`}>{product.name}</Link></h2><span className="cart-language">{product.language}</span></div><small>{product.stock} disponibles</small><p className="cart-unit-price">{money(Number(product.price_mxn))} <span>por pieza</span></p><button className="cart-remove" type="button" onClick={() => removeItem(product.id)}><TrashIcon /><span>Quitar</span></button></div>
        <div className="cart-item-price"><strong>{money(Number(product.price_mxn) * quantity)}</strong><div className="quantity-control" aria-label={`Cantidad de ${product.name}`}><button type="button" aria-label="Reducir cantidad" disabled={quantity <= 1} onClick={() => setQuantity(product.id, quantity - 1)}>−</button><span>{quantity}</span><button type="button" aria-label="Aumentar cantidad" disabled={quantity >= Math.min(99, product.stock)} onClick={() => setQuantity(product.id, quantity + 1)}>+</button></div></div>
      </article>)}
    </section>
    <aside className="cart-summary"><p className="cart-eyebrow">RESUMEN</p><h2>Tu pedido</h2><div><span>Productos</span><strong>{money(subtotal)}</strong></div><div><span>Envío</span><strong>Se calcula en el checkout</strong></div><div className="cart-total"><span>Total estimado</span><strong>{money(subtotal)}</strong></div><Link className="cart-primary cart-checkout" href="/checkout">Ir al checkout</Link><Link className="cart-back-link" href="/catalogo">Seguir explorando</Link></aside>
  </div></>;
}

export function CartItemCount() {
  const { itemCount, ready } = useCart();
  if (!ready) return <p>Revisa los productos y cantidades que elegiste.</p>;
  return <p>{itemCount} {itemCount === 1 ? "artículo listo" : "artículos listos"} para el checkout.</p>;
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 7h15M10 10.5v7m4-7v7M6.5 7l.8 13h9.4l.8-13M9 7V4.5h6V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
