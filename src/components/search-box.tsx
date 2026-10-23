"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const [draft, setQuery] = useState(initialQuery);
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const inCatalog = pathname === "/catalogo" || pathname === "/ofertas" || pathname === "/preventas" || pathname.startsWith("/categorias/") || pathname.startsWith("/expansiones/");
  const [isOpen, setIsOpen] = useState(inCatalog && params.has("q"));
  const query = inCatalog ? params.get("q") || "" : draft;
  const inputRef = useRef<HTMLInputElement>(null);
  const searchNavigation = useRef(false);

  useEffect(() => {
    if (isOpen || (inCatalog && sessionStorage.getItem("store:search-focus") === "1")) {
      inputRef.current?.focus({ preventScroll: true });
      sessionStorage.removeItem("store:search-focus");
    }
  }, [isOpen, inCatalog]);

  function updateSearch(nextQuery: string) {
    setQuery(nextQuery);
    if (inCatalog) {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("page");
      if (nextQuery.trim()) nextUrl.searchParams.set("q", nextQuery);
      else nextUrl.searchParams.delete("q");
      window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    } else if (nextQuery.trim() || searchNavigation.current) {
      searchNavigation.current = true;
      sessionStorage.setItem("store:search-focus", "1");
      router.replace("/catalogo?q=" + encodeURIComponent(nextQuery), { scroll: false });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inCatalog) { router.push("/catalogo" + (query.trim() ? "?q=" + encodeURIComponent(query.trim()) : "")); return; }
    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={`search-control${isOpen ? " is-open" : ""}`}>
      <button
        className="search-toggle"
        type="button"
        aria-label={isOpen ? "Cerrar búsqueda" : "Abrir búsqueda"}
        aria-expanded={isOpen}
        aria-controls="product-search"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="search-icon" aria-hidden="true" />
      </button>
      <form className="search-box" id="product-search" role="search" action="/catalogo" method="get" onSubmit={handleSubmit}>
        <span className="search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          name="q"
          value={query}
          onChange={(event) => updateSearch(event.target.value)}
          aria-label="Buscar productos"
          placeholder="Buscar productos..."
          onFocus={() => { if (!inCatalog) router.prefetch("/catalogo"); }}
        />
        {query && <button className="search-close" type="button" aria-label="Limpiar búsqueda" onClick={() => updateSearch("")}>×</button>}
      </form>
    </div>
  );
}
