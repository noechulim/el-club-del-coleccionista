import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CategorySection } from "@/components/category-section";
import { ClubBanner } from "@/components/club-banner";
import { CatalogSection } from "@/components/catalog-section";
import { HeroSection } from "@/components/hero-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
export default function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <><SiteHeader /><main><Suspense fallback={null}><LegacySearch searchParams={searchParams} /></Suspense><HeroSection /><CategorySection /><Suspense fallback={null}><CatalogSection /></Suspense><ClubBanner /></main><SiteFooter /></>; }
async function LegacySearch({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const params = await searchParams; const query = new URLSearchParams(); for (const key of ["q", "category", "collection", "offer", "preorder", "minPrice", "maxPrice", "available"]) { const value = params[key]; if (value) query.set(key, Array.isArray(value) ? value[0] : value); } if (query.size) redirect("/catalogo?" + query); return null; }
