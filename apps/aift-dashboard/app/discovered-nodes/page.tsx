export default function DiscoveredNodesPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">AIFT VPS</p>
        <h1>Discovered Nodes</h1>
        <p>Phase 2A begins the local discovery layer for the decentralized VPS network.</p>
      </section>

      <section className="grid two">
        <div className="panel-card">
          <h2>Node cards</h2>
          <p className="muted">Each device can publish a small local identity card for discovery.</p>
        </div>

        <div className="panel-card">
          <h2>Heartbeat</h2>
          <p className="muted">Each device can write its current local status for the dashboard to read later.</p>
        </div>
      </section>

      <section className="panel-card">
        <h2>Next milestone</h2>
        <p>Show imported node cards and recent heartbeat records directly in this dashboard.</p>
      </section>
    </main>
  );
}
