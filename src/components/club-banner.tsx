import Link from "next/link";
export function ClubBanner() {
  return (
    <section className="club-banner section-wrap">
      <div className="banner-star">✦</div>
      <div>
        <p className="eyebrow">HECHO PARA COLECCIONISTAS</p>
        <h2>Tu próxima pieza<br /><em>te está esperando.</em></h2>
      </div>
      <Link className="button button-primary" href="/catalogo">
        Descubrir productos <span>→</span>
      </Link>
    </section>
  );
}
