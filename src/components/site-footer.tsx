import Link from "next/link";
import type { ReactNode } from "react";

type TrustBadge = {
  icon: ReactNode;
  title: string;
  desc: string;
};

const trustBadges: TrustBadge[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: "Empaque para coleccionistas",
    desc: "Tus cartas protegidas con toploaders, fundas y burbuja.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    title: "Envíos a todo México",
    desc: "Calculado por estado con guía rastreable en línea.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
    title: "Atención por WhatsApp",
    desc: "Acompañamiento y resolución rápida para tus compras.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
        <polyline points="2 9 12 21 22 9" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    ),
    title: "100% Originales",
    desc: "Productos sellados y cartas auténticas en inglés.",
  },
];

const groups = [
  {
    title: "Explora",
    links: [
      ["Catálogo completo", "/catalogo"],
      ["Productos sellados", "/categorias/sellado"],
      ["Cartas sueltas (Singles)", "/categorias/cartas-individuales"],
      ["Ofertas especiales", "/ofertas"],
    ],
  },
  {
    title: "Tu compra",
    links: [
      ["Rastrea tu pedido", "/seguimiento"],
      ["Mi cuenta y pedidos", "/cuenta"],
      ["Ver carrito de compra", "/carrito"],
      ["Tarifas de envío", "/envios"],
      ["Cambios y devoluciones", "/cambios-y-devoluciones"],
    ],
  },
  {
    title: "Atención y legal",
    links: [
      ["Preguntas frecuentes", "/preguntas-frecuentes"],
      ["Contacto directo", "/contacto"],
      ["Aviso de privacidad", "/aviso-de-privacidad"],
      ["Términos y condiciones", "/terminos-y-condiciones"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      {/* Barra de beneficios y confianza */}
      <div className="footer-trust-strip">
        <div className="footer-trust-inner">
          {trustBadges.map((badge, idx) => (
            <div key={idx} className="footer-trust-item">
              <span className="footer-trust-icon" aria-hidden="true">{badge.icon}</span>
              <div className="footer-trust-text">
                <strong>{badge.title}</strong>
                <p>{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid principal de navegación */}
      <div className="footer-main-wrap">
        <div className="footer-nav-grid">
          <div className="footer-brand-col">
            <Link prefetch={true} className="wordmark footer-logo" href="/" aria-label="Inicio">
              EL CLUB DEL <span>COLECCIONISTA</span>
            </Link>
            <p className="footer-brand-desc">
              Tu tienda especializada en Pokémon TCG, productos sellados, cartas individuales y piezas seleccionadas para coleccionistas en todo México.
            </p>
            <div className="footer-whatsapp-card">
              <span className="footer-wa-dot" />
              <div>
                <strong>¿Dudas con un pedido o carta?</strong>
                <p>Escríbenos en cualquier momento.</p>
              </div>
              <Link prefetch={true} href="/contacto" className="footer-contact-link">
                Escribir mensaje →
              </Link>
            </div>
          </div>

          {groups.map((group) => (
            <nav key={group.title} className="footer-links-col" aria-label={group.title}>
              <h2 className="footer-col-title">{group.title}</h2>
              <ul className="footer-links-list">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <Link prefetch={true} href={href} className="footer-link">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Barra inferior de derechos y divisas */}
        <div className="footer-bottom-bar">
          <p className="footer-copy">
            © 2026 El Club del Coleccionista. Todos los derechos reservados.
          </p>
          <div className="footer-pills">
            <span className="footer-currency-pill">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ marginRight: "5px" }}>
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
              Precios en MXN
            </span>
            <span className="footer-status-pill">● Tienda independiente TCG</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
