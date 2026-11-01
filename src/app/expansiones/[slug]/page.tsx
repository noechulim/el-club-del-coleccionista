import { Suspense } from "react";
import { redirect } from "next/navigation";
import { collectionHref } from "@/lib/catalog";

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={null}><RedirectToCatalog params={params} /></Suspense>;
}

async function RedirectToCatalog({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return redirect(collectionHref(slug));
}
