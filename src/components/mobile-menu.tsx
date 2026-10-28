"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <div className="mobile-menu" onKeyDown={(event) => { if (event.key === "Escape") closeMenu(); }}>
      <button
        className={`mobile-menu-toggle${isOpen ? " is-open" : ""}`}
        type="button"
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav
        id="mobile-navigation"
        className={`mobile-nav${isOpen ? " is-open" : ""}`}
        aria-label="Navegación móvil"
        aria-hidden={!isOpen}
      >
        <Link prefetch={true} href="/" onClick={closeMenu}>Inicio</Link>
        <Link prefetch={true} href="/catalogo" onClick={closeMenu}>Catálogo</Link>
        <Link prefetch={true} href="/categorias" onClick={closeMenu}>Categorías</Link>
      <Link prefetch={true} href="/expansiones" onClick={closeMenu}>Expansiones</Link><Link prefetch={true} href="/ofertas" onClick={closeMenu}>Ofertas</Link><Link prefetch={true} href="/seguimiento" onClick={closeMenu}>Rastrea tu pedido</Link><Link prefetch={true} href="/contacto" onClick={closeMenu}>Contacto</Link><Link prefetch={true} href="/cuenta" onClick={closeMenu}>Mi cuenta</Link></nav>
    </div>
  );
}
