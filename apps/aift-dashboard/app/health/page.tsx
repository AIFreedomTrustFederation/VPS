import { getHealthChecks, summarizeHealth } from '@/lib/health';

export default async function HealthPage() {
  const checks = await getHealthChecks();
  const status = summarizeHealth(checks);
  const healthy = checks.filter((check) => check.status === 'healthy').length;
  const warning = checks.filter((check) => check.status === 'warning').length;
  const broken = checks.filter((check) => check.status === 'broken').length;

  return (
    <main className="page">
      <p className="eyebrow">System Health</p>
      <h1>Health.</h1>
      <p className="lead">Catch missing registry files, missing tokens, and integration warnings before deployment becomes a problem.</p>

      <section className="grid metrics">
        <div className="card metric"><span>Overall</span><strong>{status}</strong></div>
        <div className="card metric"><span>Healthy</span><strong>{healthy}</strong></div>
        <div className="card metric"><span>Warnings</span><strong>{warning}</strong></div>
        <div className="card metric"><span>Broken</span><strong>{broken}</strong></div>
      </section>

      <section className="app-list" style={{ marginTop: '1rem' }}>
        {checks.map((check) => (
          <article className="card app-card" key={check.name}>
            <div>
              <span className={`status ${check.status}`}>{check.status}</span>
              <h3>{check.name}</h3>
              <p className="footer-note">{check.message}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
