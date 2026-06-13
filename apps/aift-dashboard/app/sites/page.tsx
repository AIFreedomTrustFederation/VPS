import { listNativeSites } from '@/lib/native-site-registry';

export default async function SitesPage() {
  const sites = await listNativeSites();

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Site Registry</p>
        <h1>Native sites.</h1>
        <p className="lead">Create, deploy, serve, and roll back browser-safe sites through the AFT decentralized cloud control plane.</p>
      </section>

      <nav className="toolbar">
        <a className="btn" href="/sites/new">Create Test Site</a>
        <a className="btn secondary" href="/domains">Domains</a>
        <a className="btn secondary" href="/deployments">Deployments</a>
      </nav>

      <section className="grid metrics">
        <div className="card metric"><span>Sites</span><strong>{sites.length}</strong></div>
        <div className="card metric"><span>Active</span><strong>{sites.filter((site) => site.status === 'active').length}</strong></div>
        <div className="card metric"><span>Building</span><strong>{sites.filter((site) => site.status === 'building').length}</strong></div>
        <div className="card metric"><span>Failed</span><strong>{sites.filter((site) => site.status === 'failed').length}</strong></div>
      </section>

      <section className="app-list" style={{ marginTop: '1rem' }}>
        {sites.length ? sites.map((site) => (
          <article className="card app-card" key={site.id}>
            <div>
              <h3>{site.title}</h3>
              <div className="meta">
                <span>{site.primaryUrl}</span>
                <span>{site.activeDeploymentId ? `active deployment ${site.activeDeploymentId.slice(0, 8)}` : 'no active deployment'}</span>
              </div>
              {site.description ? <p className="footer-note">{site.description}</p> : null}
            </div>
            <div className="actions">
              <span className={`status ${site.status}`}>{site.status}</span>
              <a className="btn secondary" href={site.gatewayPath}>Open</a>
            </div>
          </article>
        )) : (
          <article className="card metric">
            <span>No native sites yet</span>
            <strong>Create the first AFT site</strong>
            <p className="footer-note">Start with a test site, then we will wire WebAI, domains, DNS records, node assignment, and gateway failover into this same flow.</p>
          </article>
        )}
      </section>
    </main>
  );
}
