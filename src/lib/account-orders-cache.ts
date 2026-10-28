"use client";

import type { OrdersData } from "@/app/cuenta/account-dashboard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: OrdersData; savedAt: number }>();
const pending = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<() => void>>();

export function getCachedAccountOrders(userId: string): OrdersData | null {
  const entry = cache.get(userId);
  if (!entry || Date.now() - entry.savedAt > CACHE_TTL_MS) return null;
  return entry.value;
}

export function subscribeAccountOrders(userId: string, listener: () => void) {
  const userListeners = listeners.get(userId) ?? new Set<() => void>();
  userListeners.add(listener);
  listeners.set(userId, userListeners);
  return () => {
    userListeners.delete(listener);
    if (!userListeners.size) listeners.delete(userId);
  };
}

export function cacheAccountOrders(userId: string, value: OrdersData) {
  cache.set(userId, { value, savedAt: Date.now() });
  listeners.get(userId)?.forEach((listener) => listener());
}

export async function prefetchOwnAccountOrders() {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId || getCachedAccountOrders(userId)) return;
    const existing = pending.get(userId);
    if (existing) return existing;

    const request = (async () => {
      const response = await fetch("/api/cuenta/pedidos", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const result = await response.json() as { userId: string; orders: OrdersData };
      if (result.userId === userId) cacheAccountOrders(userId, result.orders);
    })().catch(() => {}).finally(() => {
      pending.delete(userId);
    });
    pending.set(userId, request);
    return request;
  } catch {
    // Account rendering remains functional if background prefetch is unavailable.
  }
}
