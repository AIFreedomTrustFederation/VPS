'use client';

import { useEffect, useState } from 'react';

type RepoState = {
  ok: boolean;
  state: string;
  ahead: number;
  behind: number;
  branch: string;
};

function repoLabel(data: RepoState | null) {
  if (!data) return 'checking';
  if (data.state === 'behind') return `behind ${data.behind}`;
  if (data.state === 'ahead') return `ahead ${data.ahead}`;
  if (data.state === 'diverged') return `diverged · ahead ${data.ahead} · behind ${data.behind}`;
  return 'up to date';
}

export function RepoStatusBar() {
  const [data, setData] = useState<RepoState | null>(null);

  async function load() {
    const response = await fetch('/api/repo-status', { cache: 'no-store' });
    if (!response.ok) return;
    setData(await response.json());
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.45rem .8rem', borderBottom: '1px solid rgba(255,247,234,.12)', background: 'rgba(7,6,10,.92)', color: '#fff7ea', fontSize: '.82rem', fontWeight: 800, overflowX: 'auto' }}>
      <span style={{ color: '#e2b952', whiteSpace: 'nowrap' }}>AIFT VPS</span>
      <span style={{ whiteSpace: 'nowrap' }}>{data?.branch || 'branch'} · {repoLabel(data)}</span>
      <a href="/controls" style={{ marginLeft: 'auto', border: '1px solid rgba(84,214,138,.75)', borderRadius: '999px', background: 'rgba(84,214,138,.14)', color: '#d8ffe7', padding: '.35rem .7rem', fontWeight: 900, whiteSpace: 'nowrap' }}>Sync</a>
      <button type="button" onClick={load} style={{ border: '1px solid rgba(255,247,234,.12)', borderRadius: '999px', background: 'rgba(255,255,255,.04)', color: 'rgba(255,247,234,.72)', padding: '.35rem .7rem', fontWeight: 800 }}>Check</button>
    </div>
  );
}
