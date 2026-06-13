import { AppCard } from '@/components/AppCard';
import { readRegistry } from '@/lib/registry';

export default async function AppsPage() {
  const apps = await readRegistry();
  const running = apps.filter((app) => app.status === 'running').length;
  const stopped = apps.filter((app) => app.status === 'stopped').length;

  return (
    <main className="page">
      <p className="eyebrow">Applications</p>
      <h1>Apps.</h1>
      <p className="lead">
        Apps are GitHub-backed workloads built and deployed across disclosed AIFT compute nodes.
      </p>

      <section className="grid metrics">
        <div className="card metric"><span>Total apps</span><strong>{apps.length}</strong></div>
        <div className="card metric"><span>Running</span><strong>{running}</strong></div>
        <div className="card metric"><span>Stopped</span><strong>{stopped}</strong></div>
        <div className="card metric"><span>Source</span><strong>GitHub</strong></div>
      </section>

      <nav className="toolbar">
        <a className="btn" href="/new">Create New App</a>
        <a className="btn secondary" href="/api/apps">Apps API</a>
      </nav>

      <section className="app-list">
        {apps.length ? apps.map((app) => <AppCard key={app.name} app={app} />) : (
          <article className="card metric">
            <span>No apps registered</span>
            <strong>Launch the first app</strong>
            <p className="footer-note">Copy or create /opt/aift/registry/apps.yml on the first managed node.</p>
          </article>
        )}
      </section>
    </main>
  );
}
