import { MobileMenu } from "@/components/mobile-menu";
import { SearchBox } from "@/components/search-box";
import Link from "next/link";
import { Suspense } from "react";
import { CartLink } from "@/components/cart-link";

export function SiteHeader({ searchQuery = "" }: { searchQuery?: string }) {
  return (
    <header className="site-header">
      <Link prefetch={true} className="wordmark" href="/" aria-label="El Club del Coleccionista, inicio">
        EL CLUB DEL <span>COLECCIONISTA</span>
      </Link>
      <nav className="desktop-nav" aria-label="Navegación principal">
        <Link prefetch={true} href="/">Inicio</Link>
        <Link prefetch={true} href="/catalogo">Catálogo</Link>
        <Link prefetch={true} href="/expansiones">Expansiones</Link><Link prefetch={true} href="/preventas">Preventas</Link><Link prefetch={true} href="/ofertas">Ofertas</Link>
      </nav>
      <div className="header-actions">
        <Suspense fallback={<span className="search-placeholder" />}><SearchBox key={searchQuery} initialQuery={searchQuery} /></Suspense>
        <Link prefetch={true} className="icon-button account-button" href="/cuenta" aria-label="Mi cuenta">
          <svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.25" />
            <path d="M5.5 20c.55-3.35 2.75-5.1 6.5-5.1s5.95 1.75 6.5 5.1" />
          </svg>
        </Link>
        <CartLink />
        <MobileMenu />
      </div>
    </header>
  );
}
