const registryModules = [
  'Reserved Names',
  'Domain Applications',
  'Registrants',
  'Abuse Reports',
  'Disputes',
  'Suspensions',
  'Ownership Transfers',
  'Launch Phases',
  'Audit Logs',
  'ICANN Readiness'
];

export default function RegistryPage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Registry</p>
        <h1>Registry governance.</h1>
        <p className="lead">Prepare the internal AFT namespace and future .aft registry operation with policy, ownership, abuse review, and launch controls.</p>
      </section>

      <section className="grid metrics">
        <div className="card metric"><span>Reserved Names</span><strong>0</strong></div>
        <div className="card metric"><span>Applications</span><strong>0</strong></div>
        <div className="card metric"><span>Abuse Reports</span><strong>0</strong></div>
        <div className="card metric"><span>Readiness</span><strong>Phase 0</strong></div>
      </section>

      <section className="app-list" style={{ marginTop: '1rem' }}>
        {registryModules.map((module) => (
          <article className="card app-card" key={module}>
            <div>
              <span className="status pending">planned</span>
              <h3>{module}</h3>
              <p className="footer-note">This module becomes part of the AFT provider control suite after the domain and DNS data models are active.</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
