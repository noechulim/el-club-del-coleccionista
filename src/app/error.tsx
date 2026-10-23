"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="store-page section-wrap"><section className="catalog-empty"><h1>No pudimos cargar esta página</h1><p>Intenta de nuevo en unos momentos. Tu carrito sigue guardado en este navegador.</p><button className="store-secondary" onClick={reset}>Intentar de nuevo</button> <Link className="store-secondary" href="/catalogo">Volver al catálogo</Link></section></main>; }
