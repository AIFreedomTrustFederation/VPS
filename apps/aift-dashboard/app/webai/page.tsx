type SourceStatus = {
  id: string;
  label: string;
  path: string;
  exists: boolean;
};

type DirectoryStatus = {
  file_count: number;
};

type NodeContext = {
  aift_home: string;
  heartbeats: DirectoryStatus;
  node_cards: DirectoryStatus;
  logs: DirectoryStatus;
};

type WebAIContext = {
  generated_at: string;
  repo_context: SourceStatus[];
  node_context: NodeContext[];
  summary: {
    repo_files_found: number;
    repo_files_missing: number;
    aift_home_count: number;
    heartbeat_file_count: number;
    node_card_file_count: number;
  };
  recommended_next_step: string;
};

async function getWebAIContext(): Promise<WebAIContext | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000';
    const response = await fetch(`${baseUrl}/api/webai/context`, { cache: 'no-store' });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export default async function WebAIPage() {
  const context = await getWebAIContext();
  const repoContext = context?.repo_context ?? [];
  const nodeContext = context?.node_context ?? [];

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">WebAI</p>
        <h1>AIFT VPS chat assistant</h1>
        <p>Chat-based workspace for building apps, reviewing real node status, connecting repositories, drafting user messages, and keeping the decentralized VPS network aligned.</p>
      </section>

      <section className="grid two">
        <aside className="panel-card">
          <h2>Chat history</h2>
          <p className="muted">No saved WebAI conversations found yet. Chat history will appear only after real WebAI conversation storage is connected.</p>
          <div className="stack-list">
            <div className="row-card"><strong>+</strong><span>New chat</span></div>
            <div className="row-card"><strong>0</strong><span>Project chats</span></div>
            <div className="row-card"><strong>0</strong><span>Node chats</span></div>
            <div className="row-card"><strong>0</strong><span>Status chats</span></div>
          </div>
        </aside>

        <section className="panel-card">
          <h2>Real context</h2>
          {context ? (
            <div className="stack-list">
              <div className="row-card"><strong>{context.summary.repo_files_found}</strong><span>Repo context files found</span></div>
              <div className="row-card"><strong>{context.summary.repo_files_missing}</strong><span>Repo context files missing</span></div>
              <div className="row-card"><strong>{context.summary.aift_home_count}</strong><span>Local AIFT runtime folders</span></div>
              <div className="row-card"><strong>{context.summary.heartbeat_file_count}</strong><span>Heartbeat files</span></div>
              <div className="row-card"><strong>{context.summary.node_card_file_count}</strong><span>Node card files</span></div>
            </div>
          ) : (
            <p className="muted">WebAI context API is not reachable yet.</p>
          )}
        </section>
      </section>

      <section className="panel-card">
        <h2>Recommended next step</h2>
        <p className="muted">{context?.recommended_next_step ?? 'Start the dashboard and WebAI context API on a real node.'}</p>
      </section>

      <section className="grid two">
        <section className="panel-card">
          <h2>Repository context</h2>
          <div className="stack-list">
            {repoContext.length === 0 ? (
              <div className="row-card"><strong>0</strong><span>No repository context loaded.</span></div>
            ) : repoContext.map((item) => (
              <div className="row-card" key={item.id}>
                <strong>{item.exists ? '✓' : '!'}</strong>
                <span>{item.label} — {item.path}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-card">
          <h2>Node context</h2>
          <div className="stack-list">
            {nodeContext.length === 0 ? (
              <div className="row-card"><strong>0</strong><span>No local AIFT runtime folders found.</span></div>
            ) : nodeContext.map((node) => (
              <div className="row-card" key={node.aift_home}>
                <strong>{node.heartbeats.file_count}</strong>
                <span>{node.aift_home} — {node.node_cards.file_count} node cards, {node.logs.file_count} logs</span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="panel-card">
        <h2>Composer</h2>
        <p className="muted">Message composer shell. The next implementation should connect this to real WebAI conversation storage, an open-source AI runtime, and approved node actions.</p>
      </section>
    </main>
  );
}
