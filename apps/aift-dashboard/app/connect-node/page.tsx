export default function ConnectNodePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Mobile VPS</p>
        <h1>Connect Node</h1>
        <p>Use this page to connect a server to AI Freedom Trust Cloud from a phone or browser.</p>
      </section>

      <section className="grid two">
        <div className="panel-card">
          <h2>Tenant</h2>
          <p className="muted">AI Freedom Trust</p>
          <p>First tenant identity is standardized for Phase Zero.</p>
        </div>

        <div className="panel-card">
          <h2>First Node</h2>
          <p className="muted">Sacramento Node 001</p>
          <p>Machine name: sacramento-node-001</p>
        </div>
      </section>

      <section className="panel-card">
        <h2>Connection Steps</h2>
        <div className="stack-list">
          <div className="row-card"><strong>1</strong><span>Open this page on mobile.</span></div>
          <div className="row-card"><strong>2</strong><span>Run the standard node enrollment script on the server.</span></div>
          <div className="row-card"><strong>3</strong><span>Add the generated deployment values into GitHub repository secrets.</span></div>
          <div className="row-card"><strong>4</strong><span>Run the automated pipeline.</span></div>
          <div className="row-card"><strong>5</strong><span>Verify the node in Health, Nodes, Apps, and Deployments.</span></div>
        </div>
      </section>
    </main>
  );
}
