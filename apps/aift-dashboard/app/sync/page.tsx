import { RepoStatusBar } from '../RepoStatusBar';
import { LocalActionsClient } from '../webai/LocalActionsClient';

export default function SyncPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Sync</p>
        <h1>VPS sync center</h1>
        <p>This page checks the real local AIFT VPS checkout and gives you the live node actions used to update files, write heartbeats, inspect services, and review logs.</p>
      </section>

      <section className="panel-card">
        <h2>Repository state</h2>
        <p className="muted">This reads the local repository on disk and compares it with the GitHub branch.</p>
        <RepoStatusBar />
      </section>

      <LocalActionsClient />

      <section className="panel-card">
        <h2>Important</h2>
        <p className="muted">After repository files sync, the dashboard process may still need a restart before the browser sees new compiled code. If the page still looks old after sync, restart the dashboard and reload the page.</p>
        <div className="toolbar">
          <a className="btn secondary" href="/logs">Open logs</a>
          <a className="btn secondary" href="/readiness">Open readiness</a>
        </div>
      </section>
    </main>
  );
}
