import { categories } from "@/data/store-content";
import Link from "next/link";
import { categoryHref } from "@/lib/catalog";

export function CategorySection() {
  return (
    <section className="category-section section-wrap" id="categorias">
      <div className="section-heading">
        <div>
          <p className="eyebrow">EXPLORA LA TIENDA</p>
          <h2>¿Qué buscas hoy?</h2>
        </div>
        <Link prefetch={true} className="text-link" href="/categorias">Ver todas las categorías <span>→</span></Link>
      </div>
      <div className="category-grid">
        {categories.map((category, index) => (
          <Link prefetch={true} className="category-card" href={categoryHref(category.category)} key={category.title}>
            <span className={`category-icon icon-${index}`}>{category.icon}</span>
            <span className="category-text">
              <b>{category.title}</b>
              <small>{category.detail}</small>
            </span>
            <span className="category-arrow">↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
