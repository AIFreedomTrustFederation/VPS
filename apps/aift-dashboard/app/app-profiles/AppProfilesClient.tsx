'use client';

import { useEffect, useState } from 'react';

type ProfileResult = {
  profile: {
    id: string;
    repo: string;
    framework: string;
    package_manager: string;
    profile_ready: boolean;
    install_command: string;
    build_command: string;
    dev_command: string;
    verify_command: string;
    notes: string[];
  };
  workload: {
    id: string;
    status: string;
    notes: string;
  };
};

export function AppProfilesClient() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [message, setMessage] = useState('');

  async function generateAll() {
    setRunning(true);
    setMessage('Generating app profiles...');
    const response = await fetch('/api/app-profiles/generate', { method: 'POST' });
    const data = await response.json();
    setResults(data.results ?? []);
    setMessage(data.ok ? `Generated ${data.count} profile(s).` : data.error || 'Profile generation failed.');
    setRunning(false);
  }

  async function loadCollections() {
    const response = await fetch('/api/engine/collections', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const profiles = data.collections?.app_profiles ?? [];
    const workloads = data.collections?.workloads ?? [];
    setResults(profiles.map((profile: ProfileResult['profile']) => ({
      profile,
      workload: workloads.find((item: ProfileResult['workload'] & { profile_id?: string }) => item.profile_id === profile.id) || { id: '', status: 'unknown', notes: '' },
    })));
  }

  useEffect(() => {
    loadCollections();
  }, []);

  return (
    <section className="panel-card">
      <h2>App profiles</h2>
      <p className="muted">Turn saved app sources into launch profiles with detected stack, commands, and workload records.</p>
      <div className="toolbar">
        <button className="btn" type="button" disabled={running} onClick={generateAll}>{running ? 'Generating...' : 'Create app profiles'}</button>
        <button className="btn secondary" type="button" disabled={running} onClick={loadCollections}>Reload profiles</button>
      </div>
      {message && <p className="muted">{message}</p>}
      <div className="app-list">
        {results.length === 0 ? <div className="card metric"><span>No app profiles yet.</span><strong>0</strong></div> : results.map((item) => (
          <article className="card app-card" key={item.profile.id}>
            <div>
              <h3>{item.profile.repo}</h3>
              <div className="meta">
                <span>Framework: {item.profile.framework}</span>
                <span>Package manager: {item.profile.package_manager}</span>
                <span>Workload: {item.workload.status}</span>
              </div>
              <p className="footer-note">{item.profile.notes?.join(' ')}</p>
              <div className="stack-list">
                <div className="row-card"><strong>Install</strong><span>{item.profile.install_command || 'Not detected'}</span></div>
                <div className="row-card"><strong>Build</strong><span>{item.profile.build_command || 'Not detected'}</span></div>
                <div className="row-card"><strong>Dev</strong><span>{item.profile.dev_command || 'Not detected'}</span></div>
                <div className="row-card"><strong>Verify</strong><span>{item.profile.verify_command || 'Not detected'}</span></div>
              </div>
            </div>
            <span className={`status ${item.profile.profile_ready ? 'successful' : 'pending'}`}>{item.profile.profile_ready ? 'Ready' : 'Review'}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
