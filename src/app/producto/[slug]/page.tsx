import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductDetail } from "@/components/product-detail";
import { getActiveProductBySlug, getRelatedProducts } from "@/lib/products-server";
import { categoryHref } from "@/lib/catalog";
import { categoryLabels } from "@/lib/products";
import "../../styles/product-detail.css";
import { PagePlaceholder } from "@/components/page-shell";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) {
    return {
      title: "Producto no encontrado | El Club del Coleccionista",
    };
  }

  const categoryName = categoryLabels[product.category] || "Pokémon TCG";
  const setName = product.set_name ? ` · ${product.set_name}` : "";
  const priceFormatted = `$${Number(product.price_mxn).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
  const title = `${product.name}${setName} | El Club del Coleccionista`;
  const description = product.description
    ? `${product.description.slice(0, 150)} — ${priceFormatted}`
    : `Consigue ${product.name} (${categoryName}) por ${priceFormatted} en El Club del Coleccionista. Envíos seguros a todo México.`;

  const imageUrl = product.image_url || "/pokemon-card.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function ProductPage({ params }: PageProps<"/producto/[slug]">) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<PagePlaceholder />}>
        <ProductContent params={params} />
      </Suspense>
      <SiteFooter />
    </>
  );
}

async function ProductContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();
  const relatedProducts = await getRelatedProducts(product);

  return <main className="product-detail-page">
    <nav className="product-breadcrumb" aria-label="Migas de pan">
      <Link href="/">Inicio</Link><span>/</span><Link href="/catalogo">Catálogo</Link><span>/</span><Link href={categoryHref(product.category)}>{categoryLabels[product.category]}</Link><span>/</span><span aria-current="page">{product.name}</span>
    </nav>
    <ProductDetail key={product.id} product={product} relatedProducts={relatedProducts} />
  </main>;
}
