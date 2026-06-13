import { headers } from 'next/headers';

type ShellContext = {
  summary: {
    apps: number;
    templates: number;
    registry_examples: number;
    docs: number;
    scripts: number;
    runtime_folders: number;
    heartbeat_files: number;
    node_card_files: number;
    log_files: number;
  };
};

async function getShellContext(): Promise<ShellContext | null> {
  try {
    const headerStore = await headers();
    const host = headerStore.get('host') || '127.0.0.1:3000';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const response = await fetch(`${protocol}://${host}/api/shell/context`, { cache: 'no-store' });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export default async function ShellPage() {
  const context = await getShellContext();
  const summary = context?.summary;

  const flow = [
    'Create project from real source',
    'Choose real template package',
    'Connect authorized repository',
    'Configure build settings',
    'Choose node policy',
    'Build preview on eligible node',
    'Review real logs',
    'Publish release',
    'Review disclosure record',
  ];

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">AIFT VPS Shell</p>
        <h1>Real-data workflow on decentralized VPS nodes</h1>
        <p>Create projects, build previews, publish releases, review logs, choose node policies, and disclose where every workload runs. This shell uses real repository and node context only.</p>
      </section>

      <section className="grid three">
        <div className="panel-card">
          <h2>Projects</h2>
          <p className="muted">{summary ? `${summary.apps} app folders found in the repository.` : 'Shell context API is not reachable yet.'}</p>
        </div>
        <div className="panel-card">
          <h2>Nodes</h2>
          <p className="muted">{summary ? `${summary.runtime_folders} runtime folders, ${summary.heartbeat_files} heartbeat files, ${summary.node_card_files} node cards.` : 'No real node context loaded yet.'}</p>
        </div>
        <div className="panel-card">
          <h2>Templates</h2>
          <p className="muted">{summary ? `${summary.templates} template folders and ${summary.registry_examples} registry records found.` : 'No template context loaded yet.'}</p>
        </div>
      </section>

      <section className="grid two">
        <div className="panel-card">
          <h2>Repo context</h2>
          <div className="stack-list">
            <div className="row-card"><strong>{summary?.docs ?? 0}</strong><span>Documentation files</span></div>
            <div className="row-card"><strong>{summary?.scripts ?? 0}</strong><span>Script files</span></div>
            <div className="row-card"><strong>{summary?.log_files ?? 0}</strong><span>Real local log files</span></div>
          </div>
        </div>
        <div className="panel-card">
          <h2>Empty-state rule</h2>
          <p className="muted">If projects, builds, releases, nodes, or logs do not exist yet, this shell shows counts and setup guidance instead of invented records.</p>
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
