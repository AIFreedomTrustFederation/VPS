import { WebAIChatClient } from './WebAIChatClient';

export default function WebAIPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">WebAI</p>
        <h1>AIFT VPS chat assistant</h1>
        <p>Chat with the local AIFT VPS assistant using repository files, node runtime folders, heartbeats, node cards, and logs as real context.</p>
      </section>

      <WebAIChatClient />
    </main>
  );
}
