import { LocalActionsClient } from '../webai/LocalActionsClient';

export default function ControlsPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Node</p>
        <h1>Controls</h1>
        <p>Run approved local node actions from the app and read their real terminal output.</p>
      </section>
      <LocalActionsClient />
    </main>
  );
}
