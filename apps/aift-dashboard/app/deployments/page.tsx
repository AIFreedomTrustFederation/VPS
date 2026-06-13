import { readDeployments } from '@/lib/deployments';
import { readNativeSiteRegistry } from '@/lib/native-site-registry';

export default async function DeploymentsPage() {
  const deployments = await readDeployments();
  const siteRegistry = await readNativeSiteRegistry();
  const siteDeployments = siteRegistry.deployments
    .map((deployment) => ({
      deployment,
      site: siteRegistry.sites.find((item) => item.id === deployment.siteId)
    }))
    .sort((a, b) => b.deployment.createdAt.localeCompare(a.deployment.createdAt));

  return (
    <main className="page">
      <p className="eyebrow">Deployments</p>
      <h1>Deployments.</h1>
      <p className="lead">Track app deployments and native AFT site deployments through one control plane.</p>

      <section className="grid metrics">
        <div className="card metric"><span>App Deployments</span><strong>{deployments.length}</strong></div>
        <div className="card metric"><span>Site Deployments</span><strong>{siteDeployments.length}</strong></div>
        <div className="card metric"><span>Healthy Sites</span><strong>{siteDeployments.filter((item) => item.deployment.healthStatus === 'healthy').length}</strong></div>
        <div className="card metric"><span>Fallback Ready</span><strong>{siteRegistry.sites.filter((site) => site.fallbackDeploymentId).length}</strong></div>
      </section>

      <h2 style={{ marginTop: '1.5rem' }}>Native site deployments</h2>
      <section className="app-list">
        {siteDeployments.length ? siteDeployments.map(({ deployment, site }) => (
          <article className="card app-card" key={deployment.id}>
            <div>
              <span className={`status ${deployment.status}`}>{deployment.status}</span>
              <h3>{site?.title || deployment.siteId}</h3>
              <div className="meta">
                <span>{deployment.id}</span>
                <span>{deployment.healthStatus}</span>
                <span>{deployment.sourceType}</span>
              </div>
              <p className="footer-note">{deployment.buildLog.slice(-2).join(' | ')}</p>
            </div>
            <div className="actions">
              {site ? <a className="btn" href={site.gatewayPath}>Open</a> : null}
              {site ? <a className="btn secondary" href={`/sites/${site.id}`}>Site</a> : null}
            </div>
          </article>
        )) : (
          <article className="card metric">
            <span>No site deployments yet</span>
            <strong>Create a test site</strong>
            <p className="footer-note">Use the Sites page to create and deploy the first browser-safe AFT website.</p>
          </article>
        )}
      </section>

      <h2 style={{ marginTop: '1.5rem' }}>Legacy app deployments</h2>
      <section className="app-list">
        {deployments.length ? deployments.map((deployment) => (
          <article className="card app-card" key={deployment.id}>
            <div>
              <span className={`status ${deployment.status}`}>{deployment.status}</span>
              <h3>{deployment.app}</h3>
              <div className="meta">
                <span>{deployment.id}</span>
                <span>{deployment.node}</span>
                <span>{deployment.domain || 'no domain'}</span>
              </div>
              <p className="footer-note">Disclosure: {deployment.disclosure_required ? 'required' : 'not required'}</p>
            </div>
            <div className="actions">
              <a className="btn" href={deployment.disclosure_path || `/disclosures/${deployment.app}`}>Disclosure</a>
              <a className="btn secondary" href="/api/deployments">API</a>
            </div>
          </article>
        )) : (
          <article className="card metric">
            <span>No legacy app deployments registered</span>
            <strong>Native sites are now the primary v0.1 path</strong>
            <p className="footer-note">The app registry remains available while AFT Domains and Sites becomes the new user-facing flow.</p>
          </article>
        )}
      </section>
    </main>
  );
}
