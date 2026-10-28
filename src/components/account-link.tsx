"use client";

import Link from "next/link";
import { prefetchOwnAccountOrders } from "@/lib/account-orders-cache";

export function AccountLink() {
  const prefetch = () => { void prefetchOwnAccountOrders(); };
  return (
    <Link prefetch className="icon-button account-button" href="/cuenta" aria-label="Mi cuenta" onPointerEnter={prefetch} onFocus={prefetch}>
      <svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5.5 20c.55-3.35 2.75-5.1 6.5-5.1s5.95 1.75 6.5 5.1" />
      </svg>
    </Link>
  );
}
