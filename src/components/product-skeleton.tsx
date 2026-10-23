export function ProductSkeleton() {
  return (
    <main className="product-detail-page product-skeleton-wrap" aria-busy="true" aria-label="Cargando detalles del producto...">
      <div className="product-detail-layout">
        <div className="product-gallery">
          <div className="skeleton-box" style={{ height: "480px", width: "100%", maxWidth: "440px", borderRadius: "18px" }} />
        </div>
        <div className="product-purchase-panel">
          <div className="skeleton-box" style={{ width: "30%", height: "14px" }} />
          <div className="skeleton-box" style={{ height: "34px", width: "75%", margin: "10px 0" }} />
          <div className="skeleton-box" style={{ height: "88px", width: "100%", margin: "14px 0", borderRadius: "14px" }} />
          <div className="skeleton-box" style={{ height: "50px", width: "100%", margin: "10px 0", borderRadius: "11px" }} />
          <div className="skeleton-box" style={{ height: "120px", width: "100%", marginTop: "16px", borderRadius: "14px" }} />
        </div>
      </div>
    </main>
  );
}
