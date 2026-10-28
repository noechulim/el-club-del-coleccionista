"use client";

import { useEffect } from "react";
import { prefetchOwnAccountOrders } from "@/lib/account-orders-cache";

export function AccountOrdersPrefetch() {
  useEffect(() => {
    void prefetchOwnAccountOrders();
  }, []);

  return null;
}
