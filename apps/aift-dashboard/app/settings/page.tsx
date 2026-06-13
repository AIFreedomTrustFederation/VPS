export default function SettingsPage() {
  const items = [
    ['Apps registry', process.env.AIFT_REGISTRY_PATH || '/opt/aift/registry/apps.yml'],
    ['Nodes registry', process.env.AIFT_NODES_PATH || '/opt/aift/registry/nodes.yml'],
    ['Templates registry', process.env.AIFT_TEMPLATES_PATH || '/opt/aift/registry/templates.yml'],
    ['Builds registry', process.env.AIFT_BUILDS_PATH || '/opt/aift/registry/builds.yml'],
    ['Deployments registry', process.env.AIFT_DEPLOYMENTS_PATH || '/opt/aift/registry/deployments.yml'],
    ['Logs path', process.env.AIFT_LOG_PATH || '/opt/aift/logs'],
    ['Coolify URL', process.env.COOLIFY_URL || 'not configured'],
    ['Dashboard token', process.env.AIFT_DASHBOARD_TOKEN ? 'configured' : 'not configured'],
    ['Node token', process.env.AIFT_NODE_TOKEN ? 'configured' : 'not configured']
  ];

  return (
    <main className="page">
      <p className="eyebrow">System Settings</p>
      <h1>Settings.</h1>
      <p className="lead">Registry paths and environment configuration for the AIFT Cloud control plane.</p>

      <section className="app-list">
        {items.map(([label, value]) => (
          <article className="card metric" key={label}>
            <span>{label}</span>
            <strong style={{ fontSize: '1rem', wordBreak: 'break-word' }}>{value}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}
