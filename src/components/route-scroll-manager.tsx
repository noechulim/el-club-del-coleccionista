"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

let previousPathname: string | null = null;

export function RouteScrollManager() {
  const pathname = usePathname();

  useEffect(() => {
    const changed = previousPathname !== null && previousPathname !== pathname;
    previousPathname = pathname;
    if (!changed || window.location.hash) return;
    const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
