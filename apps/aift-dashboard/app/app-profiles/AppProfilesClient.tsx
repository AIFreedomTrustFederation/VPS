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
    workspace_path?: string;
    log_path?: string;
  };
};

export function AppProfilesClient() {
  const [running, setRunning] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
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

  async function addSourceAndGenerate() {
    if (!repoUrl.trim()) {
      setMessage('Paste a GitHub repo URL first, or use Create app profiles for saved sources.');
      return;
    }

    setRunning(true);
    setMessage('Saving source...');
    const saveResponse = await fetch('/api/app-sources', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: repoUrl.trim() }),
    });
    const saveData = await saveResponse.json();

    if (!saveData.ok) {
      setMessage(saveData.error || 'Could not save source.');
      setRunning(false);
      return;
    }

    setMessage('Source saved. Generating profile...');
    const profileResponse = await fetch(`/api/app-sources/${saveData.source.id}/profile`, { method: 'POST' });
    const profileData = await profileResponse.json();

    if (!profileData.ok) {
      setMessage(profileData.error || 'Could not generate profile.');
      setRunning(false);
      return;
    }

    setRepoUrl('');
    setResults([{ profile: profileData.profile, workload: profileData.workload }, ...results.filter((item) => item.profile.id !== profileData.profile.id)]);
    setMessage(`Profile ready for ${profileData.source.repo}.`);
    setRunning(false);
  }

  async function prepareWorkspace(profile: ProfileResult['profile']) {
    setRunning(true);
    setMessage('Preparing real local workspace...');
    const response = await fetch('/api/workspaces/prepare', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profileId: profile.id }),
    });
    const data = await response.json();

    if (!data.ok) {
      setMessage(data.error || 'Workspace preparation failed. Check logs.');
      setRunning(false);
      return;
    }

    setResults((current) => current.map((item) => item.profile.id === profile.id ? { ...item, workload: data.workspace } : item));
    setMessage(`Workspace ready: ${data.workspace.workspace_path}`);
    setRunning(false);
  }

  async function installDependencies(profile: ProfileResult['profile']) {
    setRunning(true);
    setMessage('Installing dependencies in the real workspace...');
    const response = await fetch('/api/workspaces/install', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profileId: profile.id }),
    });
    const data = await response.json();

    if (!data.ok) {
      setMessage(data.error || 'Dependency installation failed. Check logs.');
      setRunning(false);
      return;
    }

    setResults((current) => current.map((item) => item.profile.id === profile.id ? { ...item, workload: data.workload } : item));
    setMessage(`Dependencies installed for ${profile.repo}.`);
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
      <div className="stack-list">
        <label className="row-card" style={{ display: 'grid', gap: '.6rem' }}>
          <strong>GitHub repo URL</strong>
          <input value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} placeholder="https://github.com/owner/repo" />
        </label>
      </div>
      <div className="toolbar">
        <button className="btn" type="button" disabled={running} onClick={addSourceAndGenerate}>{running ? 'Working...' : 'Save repo and create profile'}</button>
        <button className="btn secondary" type="button" disabled={running} onClick={generateAll}>{running ? 'Generating...' : 'Create app profiles'}</button>
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
                <div className="row-card" style={{ gap: '.75rem' }}><strong>Install:</strong><span>{item.profile.install_command || 'Not detected'}</span></div>
                <div className="row-card" style={{ gap: '.75rem' }}><strong>Build:</strong><span>{item.profile.build_command || 'Not detected'}</span></div>
                <div className="row-card" style={{ gap: '.75rem' }}><strong>Dev:</strong><span>{item.profile.dev_command || 'Not detected'}</span></div>
                <div className="row-card" style={{ gap: '.75rem' }}><strong>Verify:</strong><span>{item.profile.verify_command || 'Not detected'}</span></div>
                {item.workload.workspace_path && <div className="row-card" style={{ gap: '.75rem' }}><strong>Workspace:</strong><span>{item.workload.workspace_path}</span></div>}
              </div>
              <div className="toolbar" style={{ marginTop: '1rem' }}>
                <button className="btn" type="button" disabled={running} onClick={() => prepareWorkspace(item.profile)}>Prepare workspace</button>
                {item.workload.workspace_path && <button className="btn" type="button" disabled={running} onClick={() => installDependencies(item.profile)}>Install dependencies</button>}
                {item.workload.log_path && <a className="btn secondary" href="/logs">View logs</a>}
              </div>
              <p className="muted">Launch URL stays locked until real install, build, and runtime steps succeed.</p>
            </div>
            <span className={`status ${item.profile.profile_ready ? 'successful' : 'pending'}`}>{item.profile.profile_ready ? 'Ready' : 'Review'}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
