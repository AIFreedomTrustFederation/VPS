import { TerminalLogsClient } from '../webai/TerminalLogsClient';

export default function LogsPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Logs</p>
        <h1>Local action logs</h1>
        <p>Read the latest approved local action output from this node.</p>
      </section>

      <TerminalLogsClient />
    </main>
  );
}
