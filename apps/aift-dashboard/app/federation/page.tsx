async function loadNodes() {
  try {
    const response = await fetch('http://127.0.0.1:3001/api/federation/nodes', { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    return data.nodes || [];
  } catch {
    return [];
  }
}

export default async function FederationPage() {
  const nodes = await loadNodes();

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">AFTP VPS Relay</p>
        <h1>Federation</h1>
        <p>Local-first node registry for phones, laptops, VPS relays, and provider nodes.</p>
      </section>

      <section className="grid metrics">
        <div className="card metric"><span>Known Nodes</span><strong>{nodes.length}</strong></div>
        <div className="card metric"><span>Relay Mode</span><strong>self-hosted</strong></div>
        <div className="card metric"><span>Core Rule</span><strong>local-first</strong></div>
        <div className="card metric"><span>External APIs</span><strong>optional</strong></div>
      </section>

      <section className="panel-card">
        <h2>Federated nodes</h2>
        <p className="muted">These are the nodes currently known by this relay. A node can be LAN-local, VPS-reachable, or relay-assisted without changing its identity.</p>
        <div className="pipeline-list">
          {nodes.length === 0 ? <p className="muted">No federation nodes recorded yet.</p> : nodes.map((node: any) => (
            <article className="pipeline-step complete" key={node.node_id}>
              <strong>{node.name || node.node_id}</strong>
              <p className="muted">{node.node_id}</p>
              <p>{node.url}</p>
              <p className="muted">{node.role || 'node'} · {node.status || 'unknown'} · {node.last_seen_at || 'not seen yet'}</p>
              <div className="toolbar">
                <a className="btn secondary" href={`${node.url}/api/node-status`}>Node status</a>
                <a className="btn secondary" href={`/api/federation/resolve/${node.node_id}`}>Resolve</a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
