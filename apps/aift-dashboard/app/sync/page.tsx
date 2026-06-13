import { RepoStatusBar } from '../RepoStatusBar';
import { LocalActionsClient } from '../webai/LocalActionsClient';
import { DashboardUpdateClient } from './DashboardUpdateClient';

export default function SyncPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Sync</p>
        <h1>Dashboard sync</h1>
        <p>Update the AIFT dashboard from GitHub, restart the local dashboard server, then reload the browser.</p>
      </section>

      <section className="panel-card">
        <h2>Repository state</h2>
        <p className="muted">This reads the local AIFT VPS checkout on disk and compares it with the GitHub branch.</p>
        <RepoStatusBar />
      </section>

      <DashboardUpdateClient />

      <LocalActionsClient />

      <section className="panel-card">
        <h2>Update loop</h2>
        <p className="muted">Use this order: Update dashboard files, restart dashboard, wait a few seconds, then reload the browser. This avoids serving old compiled code after new files land.</p>
        <div className="toolbar">
          <a className="btn secondary" href="/logs">Open logs</a>
          <a className="btn secondary" href="/readiness">Open readiness</a>
        </div>
      </section>
    </main>
  );
}
