async function loadRepos() {
  try {
    const response = await fetch('http://127.0.0.1:3001/api/aift-repos', { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    return data.repos || [];
  } catch {
    return [];
  }
}

export default async function AiftReposPage() {
  const repos = await loadRepos();

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">AIFT Repo System</p>
        <h1>Sovereign repos</h1>
        <p>Local-first repository records for APK packages, app sources, static sites, node bundles, and relay-hosted project artifacts.</p>
      </section>

      <section className="grid metrics">
        <div className="card metric"><span>Repos</span><strong>{repos.length}</strong></div>
        <div className="card metric"><span>Runtime</span><strong>local JSON</strong></div>
        <div className="card metric"><span>External Source</span><strong>optional</strong></div>
        <div className="card metric"><span>Goal</span><strong>APK-ready</strong></div>
      </section>

      <section className="panel-card">
        <h2>Registered repos</h2>
        <p className="muted">These are AIFT-owned repo records. GitHub can remain an adapter, but the runtime registry lives on the node or relay.</p>
        <div className="pipeline-list">
          {repos.length === 0 ? <p className="muted">No AIFT repos registered yet.</p> : repos.map((repo: any) => (
            <article className="pipeline-step complete" key={repo.id}>
              <strong>{repo.name}</strong>
              <p className="muted">{repo.slug} · {repo.sourceType} · {repo.status}</p>
              <p>{repo.description || 'No description recorded.'}</p>
              <p className="muted">Branch: {repo.defaultBranch || 'main'}</p>
              {repo.localPath ? <p className="muted">Local path: {repo.localPath}</p> : null}
              {repo.archivePath ? <p className="muted">Archive path: {repo.archivePath}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <h2>System direction</h2>
        <p className="muted">This registry is the first step toward an AIFT-owned package, app, APK, and node bundle system. The repo identity should stay stable even when storage location, node host, or relay changes.</p>
      </section>
    </main>
  );
}
