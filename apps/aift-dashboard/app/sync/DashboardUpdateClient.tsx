'use client';

import { useState } from 'react';

type Output = {
  title: string;
  text: string;
  ok: boolean | null;
};

async function runAction(action: string) {
  const response = await fetch('/api/local-actions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return response.json();
}

export function DashboardUpdateClient() {
  const [busy, setBusy] = useState('');
  const [output, setOutput] = useState<Output | null>(null);

  async function updateFiles() {
    setBusy('update');
    setOutput({ title: 'Updating dashboard files', text: 'Checking GitHub and updating the local AIFT VPS checkout...', ok: null });
    const data = await runAction('refresh-node');
    setOutput({ title: data.ok ? 'Dashboard files updated' : 'Dashboard update needs attention', text: data.terminal || JSON.stringify(data, null, 2), ok: Boolean(data.ok) });
    setBusy('');
  }

  async function restartDashboard() {
    setBusy('restart');
    setOutput({ title: 'Restarting dashboard', text: 'Scheduling the dashboard server restart. Reload the browser after a few seconds.', ok: null });
    const data = await runAction('restart-dashboard');
    setOutput({ title: data.ok ? 'Dashboard restart scheduled' : 'Dashboard restart needs attention', text: data.terminal || JSON.stringify(data, null, 2), ok: Boolean(data.ok) });
    setBusy('');
  }

  return (
    <section className="panel-card">
      <h2>Dashboard update</h2>
      <p className="muted">Use these buttons to update the AIFT dashboard itself from the running app.</p>
      <div className="toolbar">
        <button className="btn ready-next" type="button" disabled={Boolean(busy)} onClick={updateFiles}>{busy === 'update' ? 'Updating...' : 'Update dashboard files'}</button>
        <button className="btn ready-next" type="button" disabled={Boolean(busy)} onClick={restartDashboard}>{busy === 'restart' ? 'Restarting...' : 'Restart dashboard'}</button>
        <a className="btn secondary" href="/logs">Open logs</a>
      </div>
      {output && (
        <div className="log-panel">
          <h4>{output.title}</h4>
          <div className="explainer">{output.ok === true ? 'Complete. Reload the browser if this changed the running UI.' : output.ok === false ? 'The action did not complete. Read the terminal output below.' : 'Running...'}</div>
          <pre>{output.text}</pre>
        </div>
      )}
    </section>
  );
}
