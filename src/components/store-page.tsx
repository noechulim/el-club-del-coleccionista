import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function StorePage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return <><SiteHeader /><main className="store-page section-wrap"><nav className="store-breadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><span aria-current="page">{title}</span></nav><header className="store-heading"><p className="eyebrow">EL CLUB DEL COLECCIONISTA</p><h1>{title}</h1>{intro && <p>{intro}</p>}</header>{children}</main><SiteFooter /></>;
}
