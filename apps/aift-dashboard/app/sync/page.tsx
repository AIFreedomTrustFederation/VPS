import { RepoStatusBar } from '../RepoStatusBar';
import { LocalActionsClient } from '../webai/LocalActionsClient';
import { DashboardUpdateClient } from './DashboardUpdateClient';
import { ReadyStatusClient } from './ReadyStatusClient';

export default function SyncPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Sync</p>
        <h1>Dashboard sync</h1>
        <p>Update the AIFT dashboard from GitHub, restart the local dashboard server, then wait for ready status before opening the refreshed page.</p>
      </section>

      <section className="panel-card">
        <h2>Repository state</h2>
        <p className="muted">This reads the local AIFT VPS checkout on disk and compares it with the GitHub branch.</p>
        <RepoStatusBar />
      </section>

      <DashboardUpdateClient />
      <ReadyStatusClient />

      <LocalActionsClient />

      <section className="panel-card">
        <h2>Update loop</h2>
        <p className="muted">Use this order: Update dashboard files, restart dashboard, wait for Ready, then tap Reload app. This avoids opening the old running UI too early.</p>
        <div className="toolbar">
          <a className="btn secondary" href="/logs">Open logs</a>
          <a className="btn secondary" href="/readiness">Open readiness</a>
        </div>
      </section>
    </main>
  );
}
