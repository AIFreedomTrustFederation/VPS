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

type TerminalState = {
  title: string;
  plain: string;
  output: string;
};

function isWorkspaceReady(workload: ProfileResult['workload']) {
  return Boolean(workload.workspace_path) && ['workspace-ready', 'dependencies-installed', 'build-complete'].includes(workload.status);
}

function isInstallReady(workload: ProfileResult['workload']) {
  return workload.status === 'dependencies-installed' || workload.status === 'build-complete';
}

function isBuildReady(workload: ProfileResult['workload']) {
  return workload.status === 'build-complete';
}

export function AppProfilesClient() {
  const [running, setRunning] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [message, setMessage] = useState('');
  const [terminal, setTerminal] = useState<TerminalState | null>(null);

  async function generateAll() {
    setRunning(true);
    setMessage('Generating app profiles...');
    setTerminal({ title: 'Profile generation', plain: 'Reading saved GitHub sources and creating app profiles from real repository files.', output: 'Starting profile generation...' });
    const response = await fetch('/api/app-profiles/generate', { method: 'POST' });
    const data = await response.json();
    setResults(data.results ?? []);
    setMessage(data.ok ? `Generated ${data.count} profile(s).` : data.error || 'Profile generation failed.');
    setTerminal({ title: 'Profile generation', plain: data.ok ? 'The source was inspected and the app profile is ready for the next step.' : 'The source could not be profiled. Check the response and repo access.', output: JSON.stringify(data, null, 2) });
    setRunning(false);
  }

  async function addSourceAndGenerate() {
    if (!repoUrl.trim()) {
      setMessage('Paste a GitHub repo URL first, or use Create app profiles for saved sources.');
      return;
    }

    setRunning(true);
    setMessage('Saving source...');
    setTerminal({ title: 'Save source', plain: 'Saving the GitHub repository as a real app source before profiling it.', output: `Saving ${repoUrl.trim()}` });
    const saveResponse = await fetch('/api/app-sources', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: repoUrl.trim() }),
    });
    const saveData = await saveResponse.json();

    if (!saveData.ok) {
      setMessage(saveData.error || 'Could not save source.');
      setTerminal({ title: 'Save source failed', plain: 'The repo was not saved, so no profile was generated.', output: JSON.stringify(saveData, null, 2) });
      setRunning(false);
      return;
    }

    setMessage('Source saved. Generating profile...');
    const profileResponse = await fetch(`/api/app-sources/${saveData.source.id}/profile`, { method: 'POST' });
    const profileData = await profileResponse.json();

    if (!profileData.ok) {
      setMessage(profileData.error || 'Could not generate profile.');
      setTerminal({ title: 'Profile generation failed', plain: 'The source was saved, but the profile step did not finish successfully.', output: JSON.stringify(profileData, null, 2) });
      setRunning(false);
      return;
    }

    setRepoUrl('');
    setResults([{ profile: profileData.profile, workload: profileData.workload }, ...results.filter((item) => item.profile.id !== profileData.profile.id)]);
    setMessage(`Profile ready for ${profileData.source.repo}.`);
    setTerminal({ title: 'Profile ready', plain: 'The app profile is ready. The next unlocked step is preparing a real local workspace.', output: JSON.stringify(profileData.profile, null, 2) });
    setRunning(false);
  }

  async function prepareWorkspace(profile: ProfileResult['profile']) {
    setRunning(true);
    setMessage('Preparing real local workspace...');
    setTerminal({ title: 'Prepare workspace', plain: 'The node is cloning or updating the real GitHub repository inside the local AIFT workspace.', output: 'Starting git workspace operation...' });
    const response = await fetch('/api/workspaces/prepare', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profileId: profile.id }),
    });
    const data = await response.json();

    if (!data.ok) {
      setMessage(data.error || 'Workspace preparation failed. Check logs.');
      setTerminal({ title: 'Workspace failed', plain: 'The real git workspace was not prepared. The install step remains locked.', output: data.terminal || JSON.stringify(data, null, 2) });
      setRunning(false);
      return;
    }

    setResults((current) => current.map((item) => item.profile.id === profile.id ? { ...item, workload: data.workspace } : item));
    setMessage(`Workspace ready: ${data.workspace.workspace_path}`);
    setTerminal({ title: 'Workspace ready', plain: 'The real repository is now present on this node. Dependency installation is unlocked.', output: data.terminal || JSON.stringify(data.workspace, null, 2) });
    setRunning(false);
  }

  async function installDependencies(profile: ProfileResult['profile']) {
    setRunning(true);
    setMessage('Installing dependencies in the real workspace...');
    setTerminal({ title: 'Install dependencies', plain: 'The node is running the detected package manager inside the prepared workspace.', output: profile.install_command || 'Starting dependency installation...' });
    const response = await fetch('/api/workspaces/install', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profileId: profile.id }),
    });
    const data = await response.json();

    if (!data.ok) {
      setMessage(data.error || 'Dependency installation failed. Check logs.');
      setTerminal({ title: 'Install failed', plain: 'Dependencies were not installed. The build step stays locked until this succeeds.', output: data.terminal || JSON.stringify(data, null, 2) });
      setRunning(false);
      return;
    }

    setResults((current) => current.map((item) => item.profile.id === profile.id ? { ...item, workload: data.workload } : item));
    setMessage(`Dependencies installed for ${profile.repo}.`);
    setTerminal({ title: 'Dependencies installed', plain: 'The package install finished successfully. The next real step is build execution.', output: data.terminal || JSON.stringify(data.workload, null, 2) });
    setRunning(false);
  }

  async function runBuild(profile: ProfileResult['profile']) {
    setRunning(true);
    setMessage('Running build in the real workspace...');
    setTerminal({ title: 'Run build', plain: 'The node is running the detected build command inside the prepared workspace.', output: profile.build_command || 'Starting build...' });
    const response = await fetch('/api/workspaces/run-build', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profileId: profile.id }),
    });
    const data = await response.json();

    if (!data.ok) {
      setMessage(data.error || 'Build failed. Check logs.');
      setTerminal({ title: 'Build failed', plain: 'The real build command did not finish successfully. Runtime preview stays locked.', output: data.terminal || JSON.stringify(data, null, 2) });
      setRunning(false);
      return;
    }

    setResults((current) => current.map((item) => item.profile.id === profile.id ? { ...item, workload: data.workload } : item));
    setMessage(`Build complete for ${profile.repo}.`);
    setTerminal({ title: 'Build complete', plain: 'The app built successfully. The next real step is starting a runtime process and assigning a real URL.', output: data.terminal || JSON.stringify(data.workload, null, 2) });
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
      {terminal && <div className="log-panel"><h4>{terminal.title}</h4><div className="explainer">{terminal.plain}</div><pre>{terminal.output}</pre></div>}
      <div className="app-list">
        {results.length === 0 ? <div className="card metric"><span>No app profiles yet.</span><strong>0</strong></div> : results.map((item) => {
          const profileDone = item.profile.profile_ready;
          const workspaceDone = isWorkspaceReady(item.workload);
          const installDone = isInstallReady(item.workload);
          const buildDone = isBuildReady(item.workload);
          return (
          <article className="card app-card" key={item.profile.id}>
            <div>
              <h3>{item.profile.repo}</h3>
              <div className="meta">
                <span>Framework: {item.profile.framework}</span>
                <span>Package manager: {item.profile.package_manager}</span>
                <span>Workload: {item.workload.status}</span>
              </div>
              <div className="pipeline-steps">
                <div className={`pipeline-step ${profileDone ? 'complete' : ''}`}><strong>1. Profile</strong><p className="muted">{profileDone ? 'Complete. Repository files were analyzed.' : 'Create the profile first.'}</p></div>
                <div className={`pipeline-step ${workspaceDone ? 'complete' : profileDone ? '' : 'locked'}`}><strong>2. Workspace</strong><p className="muted">{workspaceDone ? 'Complete. Real repo workspace is ready.' : 'Locked until profile is ready.'}</p></div>
                <div className={`pipeline-step ${installDone ? 'complete' : workspaceDone ? '' : 'locked'}`}><strong>3. Dependencies</strong><p className="muted">{installDone ? 'Complete. Dependencies installed.' : 'Locked until workspace is ready.'}</p></div>
                <div className={`pipeline-step ${buildDone ? 'complete' : installDone ? '' : 'locked'}`}><strong>4. Build</strong><p className="muted">{buildDone ? 'Complete. Real build succeeded.' : 'Locked until dependency install succeeds.'}</p></div>
                <div className="pipeline-step locked"><strong>5. Runtime URL</strong><p className="muted">Locked until real build and runtime process succeed.</p></div>
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
                <button className={`btn ${workspaceDone ? 'complete' : profileDone ? 'ready-next' : ''}`} type="button" disabled={running || !profileDone} onClick={() => prepareWorkspace(item.profile)}>{workspaceDone ? 'Workspace ready' : 'Prepare workspace'}</button>
                {workspaceDone && <button className={`btn ${installDone ? 'complete' : 'ready-next'}`} type="button" disabled={running || installDone} onClick={() => installDependencies(item.profile)}>{installDone ? 'Dependencies installed' : 'Install dependencies'}</button>}
                {installDone && <button className={`btn ${buildDone ? 'complete' : 'ready-next'}`} type="button" disabled={running || buildDone} onClick={() => runBuild(item.profile)}>{buildDone ? 'Build complete' : 'Run build'}</button>}
                {item.workload.log_path && <a className="btn secondary" href="/logs">View logs</a>}
              </div>
              <p className="muted">Launch URL stays locked until real install, build, and runtime steps succeed.</p>
            </div>
            <span className={`status ${item.profile.profile_ready ? 'successful' : 'pending'}`}>{item.profile.profile_ready ? 'Ready' : 'Review'}</span>
          </article>
        );})}
      </div>
    </section>
  );
}
