import { AppCard } from '@/components/AppCard';
import { config, isCoolifyConfigured } from '@/lib/config';
import { readRegistry } from '@/lib/registry';
import { listNativeSites } from '@/lib/native-site-registry';

export default async function HomePage() {
  const apps = await readRegistry();
  const sites = await listNativeSites();
  const running = apps.filter((app) => app.status === 'running').length;
  const activeSites = sites.filter((site) => site.status === 'active').length;

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AI Freedom Trust Cloud</p>
        <h1>Domain and website command center.</h1>
        <p className="lead">
          Build websites, reserve names, deploy to the decentralized VPS cloud, track node health, and keep every public route protected by health checks and fallback deployments.
        </p>
      </section>

      <section className="grid metrics">
        <div className="card metric"><span>Domains</span><strong>v0.1</strong></div>
        <div className="card metric"><span>Sites</span><strong>{sites.length}</strong></div>
        <div className="card metric"><span>Live Sites</span><strong>{activeSites}</strong></div>
        <div className="card metric"><span>Apps Running</span><strong>{running}</strong></div>
      </section>

      <nav className="toolbar">
        <a className="btn" href="/sites/new">Create Test Site</a>
        <a className="btn secondary" href="/sites">Manage Sites</a>
        <a className="btn secondary" href="/domains">Manage Domains</a>
        <a className="btn secondary" href="/nodes">Nodes</a>
        <a className="btn secondary" href="/readiness">Readiness</a>
        {config.coolifyUrl ? <a className="btn secondary" href={config.coolifyUrl} target="_blank">Open Coolify</a> : null}
      </nav>

      <section className="card metric" style={{ marginBottom: '1rem' }}>
        <span>Build order</span>
        <strong>AFT Domains and Sites v0.1</strong>
        <p className="footer-note">Registry foundation, serving route, create/deploy flow, sites dashboard, domains skeleton, DNS model, deployment status, rollback, and disclosure.</p>
      </section>

      <section className="app-list">
        {apps.length ? apps.map((app) => <AppCard key={app.name} app={app} />) : (
          <article className="card metric">
            <span>No apps registered</span>
            <strong>Start with the native site flow</strong>
            <p className="footer-note">Create a test site first. Then connect domains, DNS-like records, node assignment, gateway failover, and WebAI generation.</p>
          </article>
        )}
      </section>

      <p className="footer-note">
        Coolify: {isCoolifyConfigured() ? 'configured' : 'not configured yet'}. The AFT native site registry now provides the first browser-safe website path before full decentralized node routing is added.
      </p>
    </main>
  );
}
