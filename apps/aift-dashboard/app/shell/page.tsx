export default function ShellPage() {
  const flow = [
    "Create project",
    "Choose template",
    "Connect source",
    "Configure build",
    "Choose node policy",
    "Build preview",
    "Review logs",
    "Publish release",
    "Review disclosure",
  ];

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">AIFT VPS Shell</p>
        <h1>Vercel-style workflow on decentralized VPS nodes</h1>
        <p>Create projects, build previews, publish releases, review logs, choose node policies, and disclose where every workload runs.</p>
      </section>

      <section className="grid three">
        <div className="panel-card">
          <h2>Projects</h2>
          <p className="muted">Apps, templates, source, build settings, environments, and release history.</p>
        </div>
        <div className="panel-card">
          <h2>Nodes</h2>
          <p className="muted">Phones, laptops, desktops, servers, VPS nodes, node classes, and heartbeat status.</p>
        </div>
        <div className="panel-card">
          <h2>Disclosure</h2>
          <p className="muted">Every workload shows placement, node class, runtime type, and trust level.</p>
        </div>
      </section>

      <section className="panel-card">
        <h2>Operating flow</h2>
        <div className="stack-list">
          {flow.map((item, index) => (
            <div className="row-card" key={item}>
              <strong>{index + 1}</strong>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
