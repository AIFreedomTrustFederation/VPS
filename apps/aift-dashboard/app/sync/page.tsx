import { RepoStatusBar } from '../RepoStatusBar';
import { LocalActionsClient } from '../webai/LocalActionsClient';
import { DashboardUpdateClient } from './DashboardUpdateClient';
import { ReadyStatusClient } from './ReadyStatusClient';

const corePages = [
  ['/webai', 'WebAI'],
  ['/logs', 'Logs'],
  ['/app-profiles', 'Profiles'],
  ['/source-links', 'Sources'],
  ['/controls', 'Controls'],
  ['/readiness', 'Readiness'],
  ['/node-status', 'Node Status'],
  ['/nodes', 'Nodes'],
  ['/sites', 'Sites'],
  ['/domains', 'Domains'],
  ['/builds', 'Builds'],
  ['/health', 'Health'],
];

const liveChecks = [
  ['/api/dashboard-ready', 'Ready state'],
  ['/api/node-status', 'Node status'],
  ['/api/repo-status', 'Repo status'],
  ['/api/local-actions', 'Actions'],
  ['/api/local-action-logs', 'Action logs'],
  ['/api/services', 'Services'],
  ['/api/engine/report', 'Engine report'],
  ['/api/engine/collections', 'Engine data'],
];

export default function SyncPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Sync</p>
        <h1>Dashboard sync</h1>
        <p>Update the AIFT dashboard from GitHub, route through the active node gateway, and keep the current phone URL visible.</p>
      </section>

      <section className="panel-card">
        <h2>Wiring hub</h2>
        <p className="muted">Use this section to jump into every major live area from the already-working sync page.</p>
        <div className="toolbar">
          {corePages.map(([href, label]) => <a className="btn secondary" href={href} key={href}>{label}</a>)}
        </div>
      </section>

      <section className="panel-card">
        <h2>Live API checks</h2>
        <p className="muted">Open these endpoints directly when you need to prove the backend wiring is alive.</p>
        <div className="toolbar">
          {liveChecks.map(([href, label]) => <a className="btn secondary" href={href} key={href}>{label}</a>)}
        </div>
      </section>

      <section className="panel-card">
        <h2>Handoff and export server</h2>
        <p className="muted">These links stay available on port 3999 while the dashboard restarts or promotes a candidate.</p>
        <div className="toolbar">
          <a className="btn secondary" href="http://127.0.0.1:3999">Handoff home</a>
          <a className="btn secondary" href="http://127.0.0.1:3999/status">Raw status</a>
          <a className="btn secondary" href="http://127.0.0.1:3999/export">Export logs</a>
          <a className="btn secondary" href="http://127.0.0.1:3999/status.json">Status JSON</a>
        </div>
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
        <p className="muted">Use this order: node status, blue/green sync, handoff status, export logs, then return when the dashboard is ready.</p>
        <div className="toolbar">
          <a className="btn secondary" href="/node-status">Open node status</a>
          <a className="btn secondary" href="/logs">Open logs</a>
          <a className="btn secondary" href="/readiness">Open readiness</a>
        </div>
      </section>
    </main>
  );
}
