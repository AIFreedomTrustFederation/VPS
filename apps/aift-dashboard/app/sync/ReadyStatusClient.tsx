'use client';

import { useEffect, useState } from 'react';

type ReadyState = { ok: boolean; state: string; message: string; updated_at: string };

export function ReadyStatusClient() {
  const [data, setData] = useState<ReadyState | null>(null);
  const [error, setError] = useState('');

  async function check() {
    try {
      setError('');
      const response = await fetch('/api/dashboard-ready', { cache: 'no-store' });
      if (!response.ok) {
        setError(`Status check returned HTTP ${response.status}.`);
        return;
      }
      setData(await response.json());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Status check failed.';
      setError(message);
    }
  }

  useEffect(() => {
    check();
    const timer = setInterval(check, 2500);
    return () => clearInterval(timer);
  }, []);

  const ready = data?.state === 'ready';

  return (
    <section className="panel-card">
      <h2>Reload status</h2>
      <p className="muted">Wait until this turns green before opening the refreshed dashboard.</p>
      <div className={`pipeline-step ${ready ? 'complete' : 'locked'}`}>
        <strong>{ready ? 'Ready' : data?.state || 'Waiting'}</strong>
        <p className="muted">{data?.message || 'No dashboard restart status yet.'}</p>
        {data?.updated_at && <p className="muted">Updated: {data.updated_at}</p>}
        {error && <p className="muted">Status check issue: {error}</p>}
      </div>
      <div className="toolbar">
        <button className="btn secondary" type="button" onClick={check}>Check status</button>
        <a className="btn secondary" href="http://127.0.0.1:3999/status">Handoff status</a>
        {ready && <a className="btn complete" href="/sync">Reload app</a>}
      </div>
    </section>
  );
}
