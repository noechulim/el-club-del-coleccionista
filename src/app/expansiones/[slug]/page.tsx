import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { StorePage } from "@/components/store-page";
import { ProductGrid } from "@/components/product-grid";
import { getActiveProducts } from "@/lib/products-server";
export default function Page({ params }: { params: Promise<{ slug: string }> }) { return <Suspense fallback={null}><Content params={params} /></Suspense>; }
async function Content({ params }: { params: Promise<{ slug: string }> }) { await connection(); const { slug } = await params; const products = await getActiveProducts(); if (products && !products.some((product) => product.set_name === slug)) notFound(); return <StorePage title={slug} intro="Descubre los productos de esta colección.">{products ? <ProductGrid products={products} scope={{ collection: slug }} /> : <p className="catalog-empty">No pudimos cargar esta colección. Intenta más tarde.</p>}</StorePage>; }
