import { readDeployments } from '@/lib/deployments';

export default async function DeploymentsPage() {
  const deployments = await readDeployments();

  return (
    <main className="page">
      <p className="eyebrow">Deployments</p>
      <h1>Deployments.</h1>
      <p className="lead">Deployments connect apps, domains, and disclosed AIFT compute nodes.</p>

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
            <span>No deployments registered</span>
            <strong>Deploy the first app</strong>
            <p className="footer-note">Create /opt/aift/registry/deployments.yml on the first node.</p>
          </article>
        )}
      </section>
    </main>
  );
}
