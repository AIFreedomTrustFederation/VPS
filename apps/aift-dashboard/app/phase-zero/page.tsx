export default function PhaseZeroPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Phase Zero</p>
        <h1>Launch Status</h1>
        <p>Track the first live AIFT dashboard milestone from mobile.</p>
      </section>

      <section className="panel-card">
        <h2>Milestones</h2>
        <div className="stack-list">
          <div className="row-card"><strong>1</strong><span>Build check</span></div>
          <div className="row-card"><strong>2</strong><span>Live dashboard check</span></div>
          <div className="row-card"><strong>3</strong><span>Health check</span></div>
          <div className="row-card"><strong>4</strong><span>Node check</span></div>
        </div>
      </section>
    </main>
  );
}
