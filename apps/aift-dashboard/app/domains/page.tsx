const controlAreas = [
  'Overview',
  'DNS Records',
  'Website Connection',
  'Hosting',
  'SSL and Security',
  'Email',
  'Redirects',
  'Ownership',
  'Compliance',
  'Analytics'
];

export default function DomainsPage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Domains</p>
        <h1>Domain control panel.</h1>
        <p className="lead">Reserve names, connect websites, manage DNS-like records, and prepare the future .aft registry experience.</p>
      </section>

      <nav className="toolbar">
        <a className="btn" href="/sites/new">Create Test Site</a>
        <a className="btn secondary" href="/sites">Sites</a>
        <a className="btn secondary" href="/dns">DNS</a>
        <a className="btn secondary" href="/registry">Registry</a>
      </nav>

      <section className="grid metrics">
        <div className="card metric"><span>Domains</span><strong>0</strong></div>
        <div className="card metric"><span>Connected Sites</span><strong>0</strong></div>
        <div className="card metric"><span>DNS Health</span><strong>Ready</strong></div>
        <div className="card metric"><span>Registry</span><strong>v0.1</strong></div>
      </section>

      <section className="card metric" style={{ marginTop: '1rem' }}>
        <span>Domain owner experience</span>
        <strong>Full control suite</strong>
        <p className="footer-note">Each domain will get provider-style tabs for {controlAreas.join(', ')}.</p>
      </section>

      <section className="app-list" style={{ marginTop: '1rem' }}>
        <article className="card app-card">
          <div>
            <span className="status pending">planned</span>
            <h3>Reserve .aft names</h3>
            <p className="footer-note">Search availability, reserve internal .aft names, connect them to sites, then migrate the same records toward official registry readiness.</p>
          </div>
          <div className="actions"><a className="btn secondary" href="/dns">DNS Plan</a></div>
        </article>
        <article className="card app-card">
          <div>
            <span className="status pending">planned</span>
            <h3>Connect domains to sites</h3>
            <p className="footer-note">A domain should point to a site, active deployment, fallback deployment, node assignment, and disclosure page.</p>
          </div>
          <div className="actions"><a className="btn secondary" href="/sites">Sites</a></div>
        </article>
      </section>
    </main>
  );
}
