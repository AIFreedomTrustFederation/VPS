import { AppCard } from '@/components/AppCard';
import { config, isCoolifyConfigured } from '@/lib/config';
import { readRegistry } from '@/lib/registry';

export default async function HomePage() {
  const apps = await readRegistry();
  const running = apps.filter((app) => app.status === 'running').length;
  const stopped = apps.filter((app) => app.status === 'stopped').length;

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AI Freedom Trust VPS</p>
        <h1>App foundry dashboard.</h1>
        <p className="lead">
          A mobile-first control panel for launching, rebuilding, monitoring, and managing AI Freedom Trust apps from GitHub.
        </p>
      </section>

      <section className="grid metrics">
        <div className="card metric"><span>Apps</span><strong>{apps.length}</strong></div>
        <div className="card metric"><span>Running</span><strong>{running}</strong></div>
        <div className="card metric"><span>Stopped</span><strong>{stopped}</strong></div>
        <div className="card metric"><span>Coolify</span><strong>{isCoolifyConfigured() ? 'Ready' : 'Setup'}</strong></div>
      </section>

      <nav className="toolbar">
        <a className="btn" href="/deploy">Launch New App</a>
        <a className="btn secondary" href="/api/status">API Status</a>
        {config.coolifyUrl ? <a className="btn secondary" href={config.coolifyUrl} target="_blank">Open Coolify</a> : null}
      </nav>

      <section className="app-list">
        {apps.length ? apps.map((app) => <AppCard key={app.name} app={app} />) : (
          <article className="card metric">
            <span>No apps registered</span>
            <strong>Deploy the first test app</strong>
            <p className="footer-note">After Coolify is installed, deploy the Vite template and add it to /opt/aift/registry/apps.yml.</p>
          </article>
        )}
      </section>

      <p className="footer-note">
        This dashboard is v0.1. It reads the AIFT registry now. Rebuild, deploy, rollback, and ENV management will be wired to the selected PaaS controller after the first live deployment is proven.
      </p>
    </main>
  );
}
