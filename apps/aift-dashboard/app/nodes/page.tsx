import { readNodes } from '@/lib/nodes';

export default async function NodesPage() {
  const nodes = await readNodes();
  const online = nodes.filter((node) => node.status === 'online').length;
  const managed = nodes.filter((node) => node.operator_class === 'managed').length;
  const community = nodes.filter((node) => node.operator_class === 'verified-community').length;

  return (
    <main className="page">
      <p className="eyebrow">AIFT Compute Network</p>
      <h1>Nodes.</h1>
      <p className="lead">
        Every app must disclose the node it runs on, who operates that node, and what trust class it belongs to.
      </p>

      <section className="grid metrics">
        <div className="card metric"><span>Total nodes</span><strong>{nodes.length}</strong></div>
        <div className="card metric"><span>Online</span><strong>{online}</strong></div>
        <div className="card metric"><span>Managed</span><strong>{managed}</strong></div>
        <div className="card metric"><span>Community</span><strong>{community}</strong></div>
      </section>

      <section className="app-list" style={{ marginTop: '1rem' }}>
        {nodes.length ? nodes.map((node) => (
          <article className="card app-card" key={node.name}>
            <div>
              <span className={`status ${node.status || 'unknown'}`}>{node.status || 'unknown'}</span>
              <h3>{node.name}</h3>
              <div className="meta">
                <span>{node.operator_class || 'unknown'}</span>
                <span>{node.trust_level || 'unknown'}</span>
                <span>{node.region || 'unknown'}</span>
              </div>
              <div className="meta">
                <span>{node.operator || 'operator undisclosed'}</span>
              </div>
              <div className="meta">
                <span>{node.cpu_cores || 0} CPU</span>
                <span>{node.memory_gb || 0} GB RAM</span>
                <span>{node.storage_gb || 0} GB storage</span>
              </div>
              <p className="footer-note">Supports: {(node.supports || []).join(', ') || 'none declared'}</p>
            </div>
            <div className="actions">
              <a className="btn secondary" href="/api/nodes">API</a>
            </div>
          </article>
        )) : (
          <article className="card metric">
            <span>No nodes registered</span>
            <strong>Register node one</strong>
            <p className="footer-note">Copy registry-examples/nodes.yml to /opt/aift/registry/nodes.yml on the first VPS.</p>
          </article>
        )}
      </section>
    </main>
  );
}
