'use client';

import { useEffect, useState } from 'react';

export function TerminalLogsClient() {
  const [latest, setLatest] = useState('');

  async function loadLatest() {
    const response = await fetch('/api/local-action-logs', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    setLatest(data.latest || 'No terminal logs yet.');
  }

  useEffect(() => {
    loadLatest();
  }, []);

  return (
    <section className="panel-card">
      <h2>Terminal log</h2>
      <p className="muted">Latest saved local action output.</p>
      <button className="btn secondary" type="button" onClick={loadLatest}>Reload log</button>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', border: '1px solid rgba(255,255,255,.12)', borderRadius: '1rem', padding: '1rem', background: 'rgba(0,0,0,.35)', maxHeight: '18rem', overflow: 'auto' }}>{latest || 'No terminal logs yet.'}</pre>
    </section>
  );
}
