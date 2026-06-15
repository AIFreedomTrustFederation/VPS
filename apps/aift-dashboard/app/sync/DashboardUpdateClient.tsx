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
  { key: 'candidate', label: 'Build isolated candidate dashboard', state: 'waiting' },
  { key: 'health', label: 'Health-check candidate before promotion', state: 'waiting' },
  { key: 'promote', label: 'Promote only after candidate is healthy', state: 'waiting' },
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
    setOutput({ title: 'Blue/green sync flow', text: 'Starting isolated candidate build. Manual buttons are locked until the job is scheduled.', ok: null });

    setSteps((current) => updateStep(current, 'ports', 'running'));
    const ports = await runAction('ensure-phone-ports');
    if (!ports.ok) {
      setSteps((current) => updateStep(current, 'ports', 'error'));
      setOutput({ title: 'Phone port check failed', text: ports.terminal || JSON.stringify(ports, null, 2), ok: false });
      setBusy('');
      return;
    }
    setSteps((current) => updateStep(current, 'ports', 'complete'));

    setSteps((current) => updateStep(current, 'candidate', 'running'));
    setSteps((current) => updateStep(current, 'health', 'running'));
    const sync = await runAction('bluegreen-sync');
    if (!sync.ok) {
      setSteps((current) => updateStep(current, 'candidate', 'error'));
      setSteps((current) => updateStep(current, 'health', 'error'));
      setOutput({ title: 'Blue/green sync failed to start', text: sync.terminal || JSON.stringify(sync, null, 2), ok: false });
      setBusy('');
      return;
    }

    setSteps((current) => updateStep(current, 'candidate', 'complete'));
    setSteps((current) => updateStep(current, 'promote', 'running'));
    setOutput({ title: 'Blue/green sync scheduled', text: `${ports.terminal || ''}\n\n${sync.terminal || ''}\n\nThe candidate is building on an isolated port. Open handoff status to watch health and promotion.`, ok: true });

    window.setTimeout(() => {
      window.location.href = handoffStatusUrl;
    }, 900);
  }

  async function syncHandshake() {
    setBusy('handshake');
    setOutput({ title: 'Legacy sync handshake', text: `Scheduling legacy sync handshake. Handoff URL: ${handoffUrl}`, ok: null });
    const data = await runAction('sync-handshake');
    setOutput({ title: data.ok ? 'Legacy sync handshake scheduled' : 'Legacy sync handshake needs attention', text: data.terminal || JSON.stringify(data, null, 2), ok: Boolean(data.ok) });
    if (data.ok) {
      setTimeout(() => { window.location.href = handoffUrl; }, 650);
    }
    setBusy('');
  }

  async function bluegreenOnly() {
    setBusy('bluegreen');
    setOutput({ title: 'Blue/green sync', text: 'Scheduling isolated candidate build and health-gated promotion...', ok: null });
    const data = await runAction('bluegreen-sync');
    setOutput({ title: data.ok ? 'Blue/green sync scheduled' : 'Blue/green sync needs attention', text: data.terminal || JSON.stringify(data, null, 2), ok: Boolean(data.ok) });
    if (data.ok) {
      setTimeout(() => { window.location.href = handoffStatusUrl; }, 650);
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
    setOutput({ title: 'Starting detached dashboard supervisor', text: `The supervisor restarts the dashboard by PID and waits for health. Handoff URL: ${handoffUrl}`, ok: null });
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
      <h2>Blue/green dashboard sync</h2>
      <p className="muted">Use one button for the safe flow. It checks ports, builds a separate candidate dashboard, waits for real HTTP health, then promotes only after the candidate is healthy.</p>
      <div className="toolbar">
        <button className="btn complete" type="button" disabled={Boolean(busy)} onClick={safeRestartApp}>{busy === 'safe-restart' ? 'Scheduling blue/green sync...' : 'Sync AIFT Cloud safely'}</button>
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
          <div className="explainer">Use these only when the blue/green flow needs manual recovery.</div>
          <div className="toolbar">
            <button className="btn secondary" type="button" disabled={Boolean(busy)} onClick={ensurePhonePorts}>{busy === 'ports' ? 'Checking ports...' : 'Ensure phone ports are open'}</button>
            <button className="btn complete" type="button" disabled={Boolean(busy)} onClick={bluegreenOnly}>{busy === 'bluegreen' ? 'Starting blue/green...' : 'Blue/green sync only'}</button>
            <button className="btn secondary" type="button" disabled={Boolean(busy)} onClick={syncHandshake}>{busy === 'handshake' ? 'Starting legacy handshake...' : 'Legacy handshake only'}</button>
            <button className="btn ready-next" type="button" disabled={Boolean(busy)} onClick={updateFiles}>{busy === 'update' ? 'Updating...' : 'Update files only'}</button>
            <button className="btn ready-next" type="button" disabled={Boolean(busy)} onClick={restartDashboard}>{busy === 'restart' ? 'Restarting...' : 'PID restart only'}</button>
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
