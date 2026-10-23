"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";

export function CartLink() {
  const { itemCount, ready } = useCart();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { queueMicrotask(() => setHydrated(true)); }, []);
  const visibleCount = hydrated && ready ? itemCount : 0;
  return (
    <Link prefetch={true} className="icon-button cart-button" href="/carrito" aria-label={`Carrito, ${visibleCount} productos`}>
      <svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 4.5h2l2.15 10.1a2 2 0 0 0 1.95 1.6h8.15a2 2 0 0 0 1.93-1.48L21.5 8H6" />
        <circle cx="10" cy="19.25" r="1" />
        <circle cx="18" cy="19.25" r="1" />
      </svg>
      <i aria-live="polite">{visibleCount}</i>
    </Link>
  );
}
