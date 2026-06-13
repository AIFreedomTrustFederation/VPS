'use client';

import { useState } from 'react';

type Output = {
  title: string;
  text: string;
  ok: boolean | null;
};

const handoffUrl = 'http://127.0.0.1:3999';
const handoffExportUrl = 'http://127.0.0.1:3999/export';

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

  async function syncHandshake() {
    setBusy('handshake');
    setOutput({ title: 'Sync handshake', text: `Scheduling full sync handshake. Handoff URL: ${handoffUrl}`, ok: null });
    const data = await runAction('sync-handshake');
    setOutput({ title: data.ok ? 'Sync handshake scheduled' : 'Sync handshake needs attention', text: data.terminal || JSON.stringify(data, null, 2), ok: Boolean(data.ok) });
    if (data.ok) {
      setTimeout(() => { window.location.href = handoffUrl; }, 650);
    }
    setBusy('');
  }

  async function updateFiles() {
    setBusy('update');
    setOutput({ title: 'Updating dashboard files', text: 'Checking GitHub and updating the local AIFT VPS checkout...', ok: null });
    const data = await runAction('refresh-node');
    setOutput({ title: data.ok ? 'Dashboard files updated' : 'Dashboard update needs attention', text: data.terminal || JSON.stringify(data, null, 2), ok: Boolean(data.ok) });
    setBusy('');
  }

  async function restartDashboard() {
    setBusy('restart');
    setOutput({ title: 'Starting handoff and restarting dashboard', text: `Opening the handoff URL before restart is recommended: ${handoffUrl}`, ok: null });
    const data = await runAction('restart-dashboard');
    setOutput({ title: data.ok ? 'Dashboard restart scheduled' : 'Dashboard restart needs attention', text: data.terminal || JSON.stringify(data, null, 2), ok: Boolean(data.ok) });
    setBusy('');
  }

  return (
    <section className="panel-card">
      <h2>Dashboard update</h2>
      <p className="muted">Use one handshake button to update files, restart the whole dashboard, and move to the handoff page while the main app rebuilds.</p>
      <div className="toolbar">
        <button className="btn complete" type="button" disabled={Boolean(busy)} onClick={syncHandshake}>{busy === 'handshake' ? 'Starting handshake...' : 'Sync handshake'}</button>
        <a className="btn secondary" href={handoffUrl}>Open handoff page</a>
        <a className="btn secondary" href={handoffExportUrl}>Export sync handoff log</a>
        <button className="btn ready-next" type="button" disabled={Boolean(busy)} onClick={updateFiles}>{busy === 'update' ? 'Updating...' : 'Update dashboard files'}</button>
        <button className="btn ready-next" type="button" disabled={Boolean(busy)} onClick={restartDashboard}>{busy === 'restart' ? 'Restarting...' : 'Restart dashboard'}</button>
        <a className="btn secondary" href="/logs">Open logs</a>
      </div>
      {output && (
        <div className="log-panel">
          <h4>{output.title}</h4>
          <div className="explainer">{output.ok === true ? `Complete. Use the handoff page at ${handoffUrl} until it says the dashboard is ready.` : output.ok === false ? 'The action did not complete. Read the terminal output below.' : 'Running...'}</div>
          <pre>{output.text}</pre>
        </div>
      )}
    </section>
  );
}
