export function CatalogSkeleton() {
  return (
    <div className="catalog-skeleton-wrap" aria-busy="true" aria-label="Cargando productos...">
      <div className="skeleton-filters-bar">
        <div className="skeleton-box skeleton-search" />
        <div className="skeleton-filter-pills">
          <div className="skeleton-box skeleton-pill" />
          <div className="skeleton-box skeleton-pill" />
          <div className="skeleton-box skeleton-pill" />
          <div className="skeleton-box skeleton-pill" />
        </div>
      </div>
      <div className="product-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className="product-card skeleton-card" key={index}>
            <div className="skeleton-box skeleton-art" />
            <div className="skeleton-content">
              <div className="skeleton-box skeleton-line-sm" />
              <div className="skeleton-box skeleton-line-md" />
              <div className="skeleton-bottom">
                <div className="skeleton-box skeleton-price" />
                <div className="skeleton-box skeleton-btn" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
