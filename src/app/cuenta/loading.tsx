export default function AccountLoading() {
  return (
    <main className="account-page account-page-dashboard" aria-busy="true" aria-label="Cargando tu cuenta">
      <section className="account-dashboard">
        <header className="dashboard-welcome">
          <div className="dashboard-welcome-copy">
            <p className="dashboard-kicker"><span className="welcome-status-dot" /> TU ESPACIO EN EL CLUB</p>
            <h1>Hola, <span>coleccionista</span></h1>
            <p className="dashboard-intro">Tu colección, tus datos y tus próximos descubrimientos en un solo lugar.</p>
          </div>
          <div className="welcome-pokemon-mark" aria-hidden="true"><span className="account-loading-orb" /></div>
        </header>

        <div className="dashboard-layout">
          <aside className="account-sidebar" aria-hidden="true">
            <p className="sidebar-label">NAVEGACIÓN</p>
            <nav className="dashboard-tabs">
              <button type="button" className="is-active" disabled><span className="account-loading-line account-loading-line-short" /></button>
              <button type="button" disabled><span className="account-loading-line account-loading-line-medium" /></button>
              <button type="button" disabled><span className="account-loading-line account-loading-line-short" /></button>
            </nav>
            <div className="account-loading-identity"><span /><span /></div>
            <div className="account-loading-signout" />
          </aside>

          <section className="account-workspace" aria-hidden="true">
            <header className="workspace-heading">
              <div><p className="workspace-eyebrow">ACTIVIDAD</p><h2>Mis pedidos</h2><p>Consulta aquí el recorrido de tus compras.</p></div>
              <span className="workspace-count">&nbsp;</span>
            </header>
            <div className="account-data-skeleton"><span /><span /><span /></div>
          </section>
        </div>
      </section>
    </main>
  );
}
