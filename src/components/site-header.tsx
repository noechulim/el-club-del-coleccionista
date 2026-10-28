import { MobileMenu } from "@/components/mobile-menu";
import { SearchBox } from "@/components/search-box";
import Link from "next/link";
import { Suspense } from "react";
import { CartLink } from "@/components/cart-link";
import { AccountLink } from "@/components/account-link";

export function SiteHeader({ searchQuery = "" }: { searchQuery?: string }) {
  return (
    <header className="site-header">
      <Link prefetch={true} className="wordmark" href="/" aria-label="El Club del Coleccionista, inicio">
        EL CLUB DEL <span>COLECCIONISTA</span>
      </Link>
      <nav className="desktop-nav" aria-label="Navegación principal">
        <Link prefetch={true} href="/">Inicio</Link>
        <Link prefetch={true} href="/catalogo">Catálogo</Link>
        <Link prefetch={true} href="/expansiones">Expansiones</Link><Link prefetch={true} href="/ofertas">Ofertas</Link>
      </nav>
      <div className="header-actions">
        <Suspense fallback={<span className="search-placeholder" />}><SearchBox key={searchQuery} initialQuery={searchQuery} /></Suspense>
        <AccountLink />
        <CartLink />
        <MobileMenu />
      </div>
    </header>
  );
}
