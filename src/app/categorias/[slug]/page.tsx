import { Suspense } from "react";
import { notFound } from "next/navigation";
import { catalogCategories } from "@/lib/catalog";
import { CatalogPage } from "@/components/catalog-page";
export function generateStaticParams() { return catalogCategories.map(({ slug }) => ({ slug })); }
export default function Page({ params }: { params: Promise<{ slug: string }> }) { return <Suspense fallback={null}><Content params={params} /></Suspense>; }
async function Content({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const category = catalogCategories.find((item) => item.slug === slug); if (!category) notFound(); return <CatalogPage title={category.label} intro={`Explora ${category.label.toLowerCase()} y filtra por expansión, precio o disponibilidad.`} scope={{ category: category.category, type: category.type }} />; }
