import { notFound } from 'next/navigation';
import { readNativeSiteRegistry } from '@/lib/native-site-registry';

export default async function SiteDetailPage({ params }: { params: { siteId: string } }) {
  const registry = await readNativeSiteRegistry();
  const site = registry.sites.find((item) => item.id === params.siteId);
  if (!site) notFound();

  const deployments = registry.deployments
    .filter((deployment) => deployment.siteId === site.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const activeDeployment = deployments.find((deployment) => deployment.id === site.activeDeploymentId) || null;
  const fallbackDeployment = deployments.find((deployment) => deployment.id === site.fallbackDeploymentId) || null;

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Site Control</p>
        <h1>{site.title}</h1>
        <p className="lead">Manage the site record, active route, deployment health, fallback handoff, and future domain connections.</p>
      </section>

      <nav className="toolbar">
        <a className="btn" href={site.gatewayPath}>Open Live Site</a>
        <a className="btn secondary" href="/sites">All Sites</a>
        <a className="btn secondary" href="/deployments">Deployments</a>
        <a className="btn secondary" href="/domains">Domains</a>
      </nav>

      <section className="grid metrics">
        <div className="card metric"><span>Status</span><strong>{site.status}</strong></div>
        <div className="card metric"><span>Slug</span><strong>{site.slug}</strong></div>
        <div className="card metric"><span>Deployments</span><strong>{deployments.length}</strong></div>
        <div className="card metric"><span>Fallback</span><strong>{fallbackDeployment ? 'Ready' : 'None'}</strong></div>
      </section>

      <section className="card metric" style={{ marginTop: '1rem' }}>
        <span>Public gateway</span>
        <strong>{site.primaryUrl}</strong>
        <p className="footer-note">Active deployment: {activeDeployment?.id || 'none yet'}. Fallback deployment: {fallbackDeployment?.id || 'none yet'}.</p>
      </section>

      <h2 style={{ marginTop: '1.5rem' }}>Deployment timeline</h2>
      <section className="app-list">
        {deployments.length ? deployments.map((deployment) => (
          <article className="card app-card" key={deployment.id}>
            <div>
              <span className={`status ${deployment.status}`}>{deployment.status}</span>
              <h3>{deployment.id}</h3>
              <div className="meta">
                <span>{deployment.healthStatus}</span>
                <span>{deployment.sourceType}</span>
                <span>{deployment.activatedAt || deployment.createdAt}</span>
              </div>
              <p className="footer-note">{deployment.buildLog.join(' | ')}</p>
            </div>
            <div className="actions">
              {deployment.id === site.activeDeploymentId ? <span className="status healthy">current</span> : null}
              {deployment.id === site.fallbackDeploymentId ? <span className="status pending">fallback</span> : null}
            </div>
          </article>
        )) : (
          <article className="card metric">
            <span>No deployments</span>
            <strong>This site has not deployed yet</strong>
          </article>
        )}
      </section>
    </main>
  );
}
