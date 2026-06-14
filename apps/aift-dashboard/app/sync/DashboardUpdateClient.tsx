'use client';

import { useState } from 'react';

type Output = {
  title: string;
  text: string;
  ok: boolean | null;
};

type StepState = 'waiting' | 'running' | 'complete' | 'error';

type FlowStep = {
  key: string;
  label: string;
  state: StepState;
};

const handoffUrl = 'http://127.0.0.1:3999';
const handoffStatusUrl = 'http://127.0.0.1:3999/status';
const handoffExportUrl = 'http://127.0.0.1:3999/export';
const checkUrls = ['/api/dashboard-ready', '/api/repo-status', '/api/local-actions', '/api/services', '/api/engine/report', '/api/engine/collections'];
const initialSteps: FlowStep[] = [
  { key: 'ports', label: 'Verify phone ports and handoff server', state: 'waiting' },
  { key: 'sync', label: 'Sync repo and schedule detached supervisor', state: 'waiting' },
  { key: 'handoff', label: 'Move safely to handoff while dashboard restarts', state: 'waiting' },
  { key: 'ready', label: 'Wait for dashboard ready status', state: 'waiting' },
];

async function runAction(action: string) {
  const response = await fetch('/api/local-actions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return response.json();
}

async function checkOne(url: string) {
  try {
    const start = Date.now();
    const response = await fetch(url, { cache: 'no-store' });
    const elapsed = Date.now() - start;
    return `${response.ok ? 'GREEN' : 'RED'} ${url} ${response.status} ${elapsed}ms`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed';
    return `RED ${url} ${message}`;
  }
}

function updateStep(steps: FlowStep[], key: string, state: StepState) {
  return steps.map((step) => step.key === key ? { ...step, state } : step);
}

function stateLabel(state: StepState) {
  if (state === 'complete') return 'GREEN';
  if (state === 'running') return 'YELLOW';
  if (state === 'error') return 'RED';
  return 'WAIT';
}

export function DashboardUpdateClient() {
  const [busy, setBusy] = useState('');
  const [output, setOutput] = useState<Output | null>(null);
  const [steps, setSteps] = useState<FlowStep[]>(initialSteps);
  const [showManual, setShowManual] = useState(false);

  async function safeRestartApp() {
    setBusy('safe-restart');
    setSteps(initialSteps);
    setOutput({ title: 'Safe restart app flow', text: 'Starting ordered recovery flow. Manual buttons are locked until this finishes.', ok: null });

    setSteps((current) => updateStep(current, 'ports', 'running'));
    const ports = await runAction('ensure-phone-ports');
    if (!ports.ok) {
      setSteps((current) => updateStep(current, 'ports', 'error'));
      setOutput({ title: 'Phone port check failed', text: ports.terminal || JSON.stringify(ports, null, 2), ok: false });
      setBusy('');
      return;
    }
    setSteps((current) => updateStep(current, 'ports', 'complete'));

    setSteps((current) => updateStep(current, 'sync', 'running'));
    const sync = await runAction('sync-handshake');
    if (!sync.ok) {
      setSteps((current) => updateStep(current, 'sync', 'error'));
      setOutput({ title: 'Sync handshake failed', text: sync.terminal || JSON.stringify(sync, null, 2), ok: false });
      setBusy('');
      return;
    }
    setSteps((current) => updateStep(current, 'sync', 'complete'));

    setSteps((current) => updateStep(current, 'handoff', 'complete'));
    setSteps((current) => updateStep(current, 'ready', 'running'));
    setOutput({ title: 'Safe restart scheduled', text: `${ports.terminal || ''}\n\n${sync.terminal || ''}\n\nOpening handoff status while the detached supervisor restarts the dashboard.`, ok: true });

    window.setTimeout(() => {
      window.location.href = handoffStatusUrl;
    }, 900);
  }

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

  async function ensurePhonePorts() {
    setBusy('ports');
    setOutput({ title: 'Phone port recovery', text: 'Checking dashboard and handoff ports...', ok: null });
    const data = await runAction('ensure-phone-ports');
    setOutput({ title: data.ok ? 'Phone ports are open' : 'Phone port recovery needs attention', text: data.terminal || JSON.stringify(data, null, 2), ok: Boolean(data.ok) });
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
    setOutput({ title: 'Starting detached dashboard supervisor', text: `The supervisor will restart the dashboard on the same port. Handoff URL: ${handoffUrl}`, ok: null });
    const data = await runAction('restart-dashboard');
    setOutput({ title: data.ok ? 'Dashboard supervisor scheduled' : 'Dashboard restart needs attention', text: data.terminal || JSON.stringify(data, null, 2), ok: Boolean(data.ok) });
    setBusy('');
  }

  async function runWiringCheck() {
    setBusy('wiring');
    setOutput({ title: 'Live wiring check', text: 'Checking dashboard APIs...', ok: null });
    const rows = [];
    for (const url of checkUrls) {
      rows.push(await checkOne(url));
    }
    const failed = rows.some((row) => row.startsWith('RED'));
    setOutput({ title: failed ? 'Live wiring check found issues' : 'Live wiring check passed', text: rows.join('\n'), ok: !failed });
    setBusy('');
  }

  return (
    <section className="panel-card">
      <h2>Safe app restart</h2>
      <p className="muted">Use one button for the ordered flow. It checks phone ports, syncs the repo, launches the detached supervisor, then moves to handoff while the dashboard comes back on the same port.</p>
      <div className="toolbar">
        <button className="btn complete" type="button" disabled={Boolean(busy)} onClick={safeRestartApp}>{busy === 'safe-restart' ? 'Running safe restart...' : 'Restart AIFT Cloud safely'}</button>
        <a className="btn secondary" href={handoffStatusUrl}>Open handoff status</a>
        <a className="btn secondary" href={handoffExportUrl}>Export logs</a>
        <button className="btn secondary" type="button" disabled={Boolean(busy)} onClick={runWiringCheck}>{busy === 'wiring' ? 'Checking wiring...' : 'Run wiring check'}</button>
      </div>

      <div className="pipeline-list" style={{ marginTop: '1rem' }}>
        {steps.map((step) => (
          <article className={`pipeline-step ${step.state === 'complete' ? 'complete' : step.state === 'running' ? 'ready-next' : step.state === 'error' ? 'locked' : ''}`} key={step.key}>
            <strong>{stateLabel(step.state)} · {step.label}</strong>
          </article>
        ))}
      </div>

      <div className="toolbar" style={{ marginTop: '1rem' }}>
        <button className="btn secondary" type="button" disabled={Boolean(busy)} onClick={() => setShowManual((value) => !value)}>{showManual ? 'Hide manual fallback' : 'Show manual fallback'}</button>
      </div>

      {showManual && (
        <div className="log-panel">
          <h4>Manual fallback controls</h4>
          <div className="explainer">Use these only when the safe restart flow needs manual recovery.</div>
          <div className="toolbar">
            <button className="btn secondary" type="button" disabled={Boolean(busy)} onClick={ensurePhonePorts}>{busy === 'ports' ? 'Checking ports...' : 'Ensure phone ports are open'}</button>
            <button className="btn secondary" type="button" disabled={Boolean(busy)} onClick={syncHandshake}>{busy === 'handshake' ? 'Starting handshake...' : 'Sync handshake only'}</button>
            <button className="btn ready-next" type="button" disabled={Boolean(busy)} onClick={updateFiles}>{busy === 'update' ? 'Updating...' : 'Update files only'}</button>
            <button className="btn ready-next" type="button" disabled={Boolean(busy)} onClick={restartDashboard}>{busy === 'restart' ? 'Restarting...' : 'Restart supervisor only'}</button>
            <a className="btn secondary" href="/logs">Open logs</a>
          </div>
        </div>
      )}

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
