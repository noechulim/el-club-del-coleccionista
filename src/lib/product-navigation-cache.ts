"use client";

import { useSyncExternalStore } from "react";
import type { Product } from "@/lib/products";

const products = new Map<string, Product>();
const listeners = new Set<() => void>();

export function rememberProductForNavigation(product: Product) {
  products.set(product.slug, product);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useProductForNavigation(slug: string) {
  return useSyncExternalStore(subscribe, () => products.get(slug) ?? null, () => null);
}
