import type { AiftApp } from '@/lib/types';

export function AppCard({ app }: { app: AiftApp }) {
  const status = app.status || 'unknown';

  return (
    <article className="card app-card">
      <div>
        <span className={`status ${status}`}>{status}</span>
        <h3>{app.name}</h3>
        <div className="meta">
          <span>{app.framework || 'unknown'}</span>
          <span>{app.branch || 'main'}</span>
          {app.port ? <span>port {app.port}</span> : null}
        </div>
        <div className="meta">
          {app.domain ? <span>{app.domain}</span> : <span>No domain assigned</span>}
        </div>
      </div>
      <div className="actions">
        {app.domain ? <a className="btn secondary" href={`https://${app.domain}`} target="_blank">Open</a> : null}
        {app.repo ? <a className="btn secondary" href={app.repo} target="_blank">GitHub</a> : null}
        <a className="btn secondary" href={`/logs/${encodeURIComponent(app.name)}`}>Logs</a>
        <form action={`/api/rebuild`} method="post">
          <input type="hidden" name="app" value={app.name} />
          <button className="btn" type="submit">Rebuild</button>
        </form>
      </div>
    </article>
  );
}
