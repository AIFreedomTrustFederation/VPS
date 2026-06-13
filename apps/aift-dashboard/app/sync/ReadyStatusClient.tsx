'use client';

import { useEffect, useState } from 'react';

type ReadyState = { ok: boolean; state: string; message: string; updated_at: string };

export function ReadyStatusClient() {
  const [data, setData] = useState<ReadyState | null>(null);

  async function check() {
    const response = await fetch('/api/dashboard-ready', { cache: 'no-store' });
    if (!response.ok) return;
    setData(await response.json());
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
      </div>
      <div className="toolbar">
        <button className="btn secondary" type="button" onClick={check}>Check status</button>
        {ready && <a className="btn complete" href="/sync">Reload app</a>}
      </div>
    </section>
  );
}
