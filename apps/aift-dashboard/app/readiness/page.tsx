type ReadinessFeature = {
  id: string;
  label: string;
  status: string;
  evidence: string;
};

async function getReadiness() {
  const response = await fetch('http://127.0.0.1:' + (process.env.APP_PORT || '3001') + '/api/readiness', { cache: 'no-store' });
  if (!response.ok) return { features: [] as ReadinessFeature[] };
  return response.json() as Promise<{ features: ReadinessFeature[] }>;
}

export default async function ReadinessPage() {
  const data = await getReadiness();

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Readiness</p>
        <h1>Production readiness</h1>
        <p>Only real, open-source, non-simulated product paths should move toward launch.</p>
      </section>

      <section className="panel-card">
        <h2>Feature status</h2>
        <div className="stack-list">
          {data.features.map((feature) => (
            <div className="row-card" key={feature.id} style={{ alignItems: 'flex-start', gap: '.8rem' }}>
              <strong>{feature.label}</strong>
              <span className={`status ${feature.status === 'ready' ? 'successful' : 'pending'}`}>{feature.status}</span>
              <span>{feature.evidence}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
