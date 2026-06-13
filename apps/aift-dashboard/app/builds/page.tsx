import { readBuilds } from '@/lib/builds';

export default async function BuildsPage() {
  const builds = await readBuilds();
  const successful = builds.filter((build) => build.status === 'successful').length;
  const pending = builds.filter((build) => build.status === 'pending').length;
  const failed = builds.filter((build) => build.status === 'failed').length;

  return (
    <main className="page">
      <p className="eyebrow">Build Queue</p>
      <h1>Builds.</h1>
      <p className="lead">
        Builds convert GitHub source into deployable apps on eligible AIFT compute nodes.
      </p>

      <section className="grid metrics">
        <div className="card metric"><span>Total builds</span><strong>{builds.length}</strong></div>
        <div className="card metric"><span>Successful</span><strong>{successful}</strong></div>
        <div className="card metric"><span>Pending</span><strong>{pending}</strong></div>
        <div className="card metric"><span>Failed</span><strong>{failed}</strong></div>
      </section>

      <section className="app-list" style={{ marginTop: '1rem' }}>
        {builds.length ? builds.map((build) => (
          <article className="card app-card" key={build.id}>
            <div>
              <span className={`status ${build.status}`}>{build.status}</span>
              <h3>{build.app}</h3>
              <div className="meta">
                <span>{build.id}</span>
                <span>{build.node}</span>
                <span>{build.framework}</span>
              </div>
              <div className="meta">
                <span>started: {build.started_at || 'not started'}</span>
                <span>finished: {build.finished_at || 'not finished'}</span>
              </div>
              <p className="footer-note">Commit: {build.commit || 'unknown'}</p>
            </div>
            <div className="actions">
              <a className="btn secondary" href="/api/builds">API</a>
            </div>
          </article>
        )) : (
          <article className="card metric">
            <span>No builds registered</span>
            <strong>Create first build</strong>
            <p className="footer-note">Copy registry-examples/builds.yml to /opt/aift/registry/builds.yml on the first node.</p>
          </article>
        )}
      </section>
    </main>
  );
}
