import { listDomains } from '@/lib/domain-registry';

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

export default async function DomainsPage() {
  const domains = await listDomains();
  const connected = domains.filter((domain) => domain.connectedSiteId).length;

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Domains</p>
        <h1>Domain control panel.</h1>
        <p className="lead">Reserve names, connect websites, manage DNS-like records, and prepare the future .aft registry experience.</p>
      </section>

      <nav className="toolbar">
        <a className="btn" href="/domains/new">Reserve Domain</a>
        <a className="btn secondary" href="/sites/new">Create Site</a>
        <a className="btn secondary" href="/sites">Sites</a>
        <a className="btn secondary" href="/dns">DNS</a>
        <a className="btn secondary" href="/registry">Registry</a>
      </nav>

      <section className="grid metrics">
        <div className="card metric"><span>Domains</span><strong>{domains.length}</strong></div>
        <div className="card metric"><span>Connected Sites</span><strong>{connected}</strong></div>
        <div className="card metric"><span>Locked</span><strong>{domains.filter((domain) => domain.locked).length}</strong></div>
        <div className="card metric"><span>Registry</span><strong>v0.1</strong></div>
      </section>

      <section className="card metric" style={{ marginTop: '1rem' }}>
        <span>Domain owner experience</span>
        <strong>Full control suite</strong>
        <p className="footer-note">Each domain will get provider-style tabs for {controlAreas.join(', ')}.</p>
      </section>

      <section className="app-list" style={{ marginTop: '1rem' }}>
        {domains.length ? domains.map((domain) => (
          <article className="card app-card" key={domain.id}>
            <div>
              <span className={'status ' + domain.status}>{domain.status}</span>
              <h3>{domain.domainName}</h3>
              <div className="meta">
                <span>{domain.locked ? 'transfer locked' : 'unlocked'}</span>
                <span>{domain.autoRenew ? 'auto-renew on' : 'auto-renew off'}</span>
                <span>{domain.connectedSiteId ? 'site connected' : 'no site connected'}</span>
              </div>
            </div>
            <div className="actions">
              <a className="btn" href={'/domains/' + domain.domainName}>Manage</a>
              <a className="btn secondary" href="/dns">DNS</a>
            </div>
          </article>
        )) : (
          <article className="card metric">
            <span>No domains reserved</span>
            <strong>Reserve the first internal .aft name</strong>
            <p className="footer-note">Domain records are stored in the AFT domain registry with audit events, lock status, DNS records, and optional site connection.</p>
          </article>
        )}
      </section>
    </main>
  );
}
