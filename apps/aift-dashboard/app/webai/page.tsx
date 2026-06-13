export default function WebAIPage() {
  const dataSources = [
    "AIFT VPS repository",
    "Authorized connected repositories",
    "Local registry files",
    "Local heartbeat files",
    "Local node cards",
    "Local runtime logs",
  ];

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
          <p className="muted">No saved WebAI conversations found yet.</p>
          <div className="stack-list">
            <div className="row-card"><strong>+</strong><span>New chat</span></div>
            <div className="row-card"><strong>0</strong><span>Project chats</span></div>
            <div className="row-card"><strong>0</strong><span>Node chats</span></div>
            <div className="row-card"><strong>0</strong><span>Status chats</span></div>
          </div>
        </aside>

        <section className="panel-card">
          <h2>Current conversation</h2>
          <p className="muted">Start a conversation when WebAI chat storage and message handling are connected.</p>
          <div className="row-card">
            <strong>Real data only</strong>
            <span>WebAI should use repository files, connected repos, local registries, heartbeats, node cards, and logs. No fake operational records.</span>
          </div>
        </section>
      </section>

      <section className="panel-card">
        <h2>Allowed data sources</h2>
        <div className="stack-list">
          {dataSources.map((source) => (
            <div className="row-card" key={source}>
              <strong>✓</strong>
              <span>{source}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <h2>Composer</h2>
        <p className="muted">Message composer shell. The next implementation should connect this to real WebAI conversation storage and approved actions.</p>
      </section>
    </main>
  );
}
