import "@/app/styles/product-detail.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductNavigationPreview } from "@/components/product-navigation-preview";
import { Suspense } from "react";

export default function Loading() {
  return <><SiteHeader /><Suspense fallback={null}><ProductNavigationPreview /></Suspense><SiteFooter /></>;
}
