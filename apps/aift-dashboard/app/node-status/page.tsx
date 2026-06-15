async function loadStatus() {
  const base = process.env.AIFT_PUBLIC_BASE_URL || 'http://127.0.0.1:3001';
  try {
    const response = await fetch(`${base}/api/node-status`, { cache: 'no-store' });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

function valueOf(value: unknown) {
  if (!value) return 'not recorded';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

export default async function NodeStatusPage() {
  const data = await loadStatus();
  const status = data?.status || data || {};
  const phone = data?.phone_url || status.phone_url;
  const identity = data?.node_identity || status.node_identity;
  const router = data?.router || status.router;
  const active = data?.active_dashboard || status.active_dashboard;
  const ready = data?.ready || status.ready;

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">AIFT Provider Node</p>
        <h1>Node status</h1>
        <p>Phone IP, router target, active dashboard, and runtime health in one place.</p>
      </section>

      <section className="grid metrics">
        <div className="card metric"><span>Phone URL</span><strong>{phone?.phone_url || 'not recorded'}</strong></div>
        <div className="card metric"><span>Node ID</span><strong>{identity?.node_id || 'not recorded'}</strong></div>
        <div className="card metric"><span>Ready</span><strong>{ready?.state || 'unknown'}</strong></div>
        <div className="card metric"><span>Active Port</span><strong>{active?.target_port || router?.active_target?.port || 'unknown'}</strong></div>
      </section>

      <section className="panel-card">
        <h2>Runtime details</h2>
        <div className="log-panel"><h4>phone-url.json</h4><pre>{valueOf(phone)}</pre></div>
        <div className="log-panel"><h4>node-identity.json</h4><pre>{valueOf(identity)}</pre></div>
        <div className="log-panel"><h4>dashboard-router.json</h4><pre>{valueOf(router)}</pre></div>
        <div className="log-panel"><h4>dashboard-active.json</h4><pre>{valueOf(active)}</pre></div>
        <div className="log-panel"><h4>dashboard-ready.json</h4><pre>{valueOf(ready)}</pre></div>
      </section>
    </main>
  );
}
