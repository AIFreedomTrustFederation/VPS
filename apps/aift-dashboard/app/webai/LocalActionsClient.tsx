'use client';

import { useEffect, useState } from 'react';

type LocalAction = {
  id: string;
  label: string;
};

type ConsoleState = {
  percent: number;
  ok: boolean | null;
  title: string;
  explanation: string;
  next: string;
  terminal: string;
};

function firstSignal(text: string) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => /error|failed|fatal|denied|missing|not found|unable/i.test(line)) || lines[0] || 'No output returned.';
}

function explain(ok: boolean, action: string, text: string): ConsoleState {
  if (ok) {
    return {
      percent: 100,
      ok,
      title: 'Complete',
      explanation: `${action} finished successfully. The node can move to the next step.`,
      next: 'Continue with the next available button or review the logs.',
      terminal: text,
    };
  }

  return {
    percent: 50,
    ok,
    title: 'Needs attention',
    explanation: `The node stopped at: ${firstSignal(text)}`,
    next: 'Fix that first issue, then run the button again.',
    terminal: text,
  };
}

export function LocalActionsClient() {
  const [actions, setActions] = useState<LocalAction[]>([]);
  const [consoleState, setConsoleState] = useState<ConsoleState | null>(null);
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

  async function run(action: string, label: string) {
    setRunning(action);
    setConsoleState({ percent: 15, ok: null, title: 'Running', explanation: `${label} has started on this Termux node.`, next: 'Wait for the real output.', terminal: `Starting ${label}...` });

    const response = await fetch('/api/local-actions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    const data = await response.json();
    const terminal = data.terminal || data.error || 'No output returned.';
    setConsoleState(explain(Boolean(data.ok), label, terminal));
    setRunning('');
  }

  return (
    <section className="panel-card">
      <h2>Termux Command Center</h2>
      <p className="muted">Run approved local actions. Each result shows a progress percentage, a plain-language explanation, and the real terminal output.</p>
      <div className="toolbar">
        {actions.map((action) => (
          <button className={`btn ${consoleState?.ok && !running ? 'complete' : 'secondary'}`} key={action.id} type="button" disabled={Boolean(running)} onClick={() => run(action.id, action.label)}>
            {running === action.id ? 'Running...' : action.label}
          </button>
        ))}
      </div>
      {consoleState && (
        <div className="log-panel">
          <h4>{consoleState.title} · {consoleState.percent}%</h4>
          <div className="explainer">
            <strong>{consoleState.explanation}</strong>
            <br />
            {consoleState.next}
          </div>
          <pre>{consoleState.terminal}</pre>
        </div>
      )}
    </section>
  );
}
