'use client';

import { useEffect, useState } from 'react';

type LocalAction = {
  id: string;
  label: string;
};

export function LocalActionsClient() {
  const [actions, setActions] = useState<LocalAction[]>([]);
  const [terminal, setTerminal] = useState('');
  const [running, setRunning] = useState('');

  async function loadActions() {
    const response = await fetch('/api/local-actions', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    setActions(data.actions ?? []);
  }

  useEffect(() => {
    loadActions();
  }, []);

  async function run(action: string) {
    setRunning(action);
    setTerminal(`Running ${action}...`);

    const response = await fetch('/api/local-actions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    const data = await response.json();
    setTerminal(data.terminal || data.error || 'No output returned.');
    setRunning('');
  }

  return (
    <section className="panel-card">
      <h2>Node actions</h2>
      <p className="muted">Run approved local actions and show the terminal output here.</p>
      <div className="toolbar">
        {actions.map((action) => (
          <button className="btn secondary" key={action.id} type="button" disabled={Boolean(running)} onClick={() => run(action.id)}>
            {running === action.id ? 'Running...' : action.label}
          </button>
        ))}
      </div>
      {terminal && (
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', border: '1px solid rgba(255,255,255,.12)', borderRadius: '1rem', padding: '1rem', background: 'rgba(0,0,0,.35)' }}>{terminal}</pre>
      )}
    </section>
  );
}
