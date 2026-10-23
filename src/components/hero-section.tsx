import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="hero" id="inicio">
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="eyebrow-dot" /> POKÉMON TCG <span>·</span> PARA COLECCIONISTAS
        </p>
        <h1>Encuentra piezas<br />para <em>tu colección</em></h1>
        <p className="hero-description">
          Productos sellados, cartas sueltas y piezas calificadas para quienes disfrutan el mundo del coleccionismo.
        </p>
        <div className="hero-actions">
          <Link prefetch={true} className="button button-primary" href="/catalogo">
            Explorar catálogo <span aria-hidden="true">→</span>
          </Link>
          <Link prefetch={true} className="button button-quiet" href="/categorias">Ver categorías</Link>
        </div>
        <div className="hero-footnote"><span>✦</span> Productos Pokémon TCG en inglés</div>
      </div>

      <div className="hero-art" aria-label="Reverso de una carta Pokémon TCG flotando" role="img">
        <div className="card-stack">
          <div className="pokemon-card card-layer card-layer-back" aria-hidden="true">
            <Image
              src="/pokemon-card-back.png"
              alt=""
              width={1792}
              height={2400}
              sizes="280px"
              className="pokemon-card-image layer-card-image"
            />
          </div>
          <div className="pokemon-card card-layer card-layer-middle" aria-hidden="true">
            <Image
              src="/pokemon-card-back.png"
              alt=""
              width={1792}
              height={2400}
              sizes="280px"
              className="pokemon-card-image layer-card-image"
            />
          </div>
          <div className="pokemon-card pokemon-card-main">
            <Image
              src="/pokemon-card-back.png"
              alt="Reverso de una carta Pokémon con una Poké Ball"
              width={1792}
              height={2400}
              priority
              sizes="(max-width: 650px) 210px, 274px"
              className="pokemon-card-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
