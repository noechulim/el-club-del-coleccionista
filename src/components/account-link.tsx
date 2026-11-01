"use client";

import Link from "next/link";

export function AccountLink() {
  return (
    <Link prefetch className="icon-button account-button" href="/cuenta" aria-label="Mi cuenta">
      <svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5.5 20c.55-3.35 2.75-5.1 6.5-5.1s5.95 1.75 6.5 5.1" />
      </svg>
    </Link>
  );
}
