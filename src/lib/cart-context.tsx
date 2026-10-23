"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Product } from "@/lib/products";

export type CartItem = { product: Product; quantity: number };
type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  ready: boolean;
  addItem: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const CART_KEY = "ecc-shopping-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let restored: CartItem[] = [];
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          restored = parsed.filter((item): item is CartItem =>
            item && typeof item === "object" &&
            typeof item.product?.id === "string" &&
            Number.isInteger(item.quantity) && item.quantity > 0,
          );
        }
      }
    } catch {
      try { localStorage.removeItem(CART_KEY); } catch { /* Storage may be disabled. */ }
    }
    queueMicrotask(() => {
      setItems(restored);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* The cart remains usable when browser storage is full or unavailable. */ } }
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + Number(item.product.price_mxn) * item.quantity, 0),
    ready,
    addItem(product, quantity = 1) {
      if (product.stock < 1 || !Number.isFinite(quantity)) return;
      const amount = Math.max(1, Math.floor(quantity));
      setItems((current) => {
        const existing = current.find((item) => item.product.id === product.id);
        if (!existing) return [...current, { product, quantity: Math.min(amount, product.stock, 99) }];
        return current.map((item) => item.product.id === product.id
          ? { product, quantity: Math.min(item.quantity + amount, product.stock, 99) }
          : item);
      });
    },
    setQuantity(productId, quantity) {
      if (!Number.isFinite(quantity)) return;
      setItems((current) => current.flatMap((item) => item.product.id !== productId
        ? [item]
        : quantity <= 0 ? [] : [{ ...item, quantity: Math.max(1, Math.min(Math.floor(quantity), item.product.stock, 99)) }]));
    },
    removeItem(productId) { setItems((current) => current.filter((item) => item.product.id !== productId)); },
    clearCart() { setItems([]); },
  }), [items, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider.");
  return context;
}
