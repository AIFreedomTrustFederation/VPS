#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';

const port = Number(process.env.AIFT_HANDOFF_PORT || 3999);
const host = process.env.AIFT_HANDOFF_HOST || '127.0.0.1';
const appPort = process.env.APP_PORT || '3001';
const home = process.env.AIFT_HOME || path.join(os.homedir(), '.aift-webai');
const runtimeDir = path.join(home, 'runtime');
const readyFile = path.join(runtimeDir, 'dashboard-ready.json');
const runningFile = path.join(runtimeDir, 'dashboard-running.json');
const activeFile = path.join(runtimeDir, 'dashboard-active.json');
const logDir = path.join(home, 'logs');

function readState() {
  try {
    return JSON.parse(fs.readFileSync(readyFile, 'utf8'));
  } catch {
    return { state: 'waiting', message: 'Waiting for dashboard restart status.', updated_at: '' };
  }
}

function readFileText(file, fallback) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return fallback;
  }
}

function readLog(name, max = 18000) {
  const file = path.join(logDir, name);
  try {
    const text = fs.readFileSync(file, 'utf8');
    return text.length > max ? text.slice(text.length - max) : text;
  } catch {
    return `No ${name} file yet.`;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function statusPayload() {
  return {
    state: readState(),
    running: readFileText(runningFile, 'No dashboard-running.json file yet.'),
    active: readFileText(activeFile, 'No dashboard-active.json file yet.'),
    logs: {
      bluegreen_sync: readLog('bluegreen-sync.log', 60000),
      dashboard_candidate: readLog('dashboard-candidate.log', 60000),
      sync_handshake: readLog('sync-handshake.log'),
      sync_history: readLog('sync-history.log', 60000),
      dashboard_supervisor: readLog('dashboard-supervisor.log'),
      dashboard_runtime: readLog('dashboard-runtime.log', 60000),
      sync_handoff: readLog('sync-handoff.log'),
    }
  };
}

function exportBundle() {
  const now = new Date().toISOString();
  const payload = statusPayload();
  return [
    'AIFT LOG EXPORT',
    `Exported at: ${now}`,
    `AIFT home: ${home}`,
    '',
    '=== dashboard-ready.json ===',
    JSON.stringify(payload.state, null, 2),
    '',
    '=== dashboard-running.json ===',
    payload.running,
    '',
    '=== dashboard-active.json ===',
    payload.active,
    '',
    '=== bluegreen-sync.log ===',
    payload.logs.bluegreen_sync,
    '',
    '=== dashboard-candidate.log ===',
    payload.logs.dashboard_candidate,
    '',
    '=== sync-handshake.log ===',
    payload.logs.sync_handshake,
    '',
    '=== sync-history.log ===',
    payload.logs.sync_history,
    '',
    '=== dashboard-supervisor.log ===',
    payload.logs.dashboard_supervisor,
    '',
    '=== dashboard-runtime.log ===',
    payload.logs.dashboard_runtime,
    '',
    '=== sync-handoff.log ===',
    payload.logs.sync_handoff,
    ''
  ].join('\n');
}

function terminalBlock(title, text) {
  return `<section class="terminal-card"><h2>${escapeHtml(title)}</h2><pre>${escapeHtml(text)}</pre></section>`;
}

function statusPage() {
  const payload = statusPayload();
  const state = payload.state;
  const ready = state.state === 'ready';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="3" />
<title>AIFT Raw Sync Status</title>
<style>
:root { color-scheme: dark; }
body { margin: 0; min-height: 100vh; background: #050408; color: #fff7ea; font-family: system-ui, Arial, sans-serif; padding: 16px; }
.shell { width: min(960px, 100%); margin: 0 auto; display: grid; gap: 14px; }
.header { border: 1px solid rgba(255,247,234,.14); border-radius: 24px; background: rgba(12,10,18,.92); padding: 18px; }
.eyebrow { color: #e2b952; text-transform: uppercase; letter-spacing: .18em; font-size: .76rem; font-weight: 900; }
h1 { margin: .25rem 0 .75rem; font-size: clamp(2rem, 8vw, 4rem); line-height: 1; }
.state { border: 1px solid ${ready ? 'rgba(84,214,138,.75)' : 'rgba(226,185,82,.55)'}; border-radius: 18px; padding: 14px; background: ${ready ? 'rgba(84,214,138,.12)' : 'rgba(226,185,82,.10)'}; }
.state strong { color: ${ready ? '#d8ffe7' : '#ffe7a6'}; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
a { text-decoration: none; }
.btn { border: 1px solid rgba(255,247,234,.18); border-radius: 999px; padding: 10px 14px; color: #fff7ea; font-weight: 900; background: rgba(255,255,255,.05); }
.btn.ready { border-color: rgba(84,214,138,.85); background: rgba(84,214,138,.16); color: #d8ffe7; box-shadow: 0 0 28px rgba(84,214,138,.28); }
.terminal-card { border: 1px solid rgba(255,247,234,.14); border-radius: 20px; background: #08070d; padding: 14px; }
h2 { margin: 0 0 10px; font-size: 1.05rem; color: #e2b952; }
pre { margin: 0; min-height: 160px; max-height: 52vh; overflow: auto; white-space: pre-wrap; word-break: break-word; font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #e9ffe9; }
small { color: rgba(255,247,234,.62); }
</style>
</head>
<body>
  <main class="shell">
    <section class="header">
      <div class="eyebrow">AIFT Blue/Green Sync Status</div>
      <h1>${ready ? 'Ready' : 'Terminal status'}</h1>
      <div class="state">
        <strong>${escapeHtml(state.state || 'waiting')}</strong>
        <p>${escapeHtml(state.message || '')}</p>
        <small>${escapeHtml(state.updated_at || '')}</small>
      </div>
      <div class="actions">
        ${ready ? `<a class="btn ready" href="http://127.0.0.1:${appPort}/sync">Return to AIFT Cloud</a>` : `<a class="btn" href="/status">Refresh status</a>`}
        <a class="btn" href="/export">Export logs</a>
        <a class="btn" href="/status.json">JSON</a>
        <a class="btn" href="/">Handoff</a>
      </div>
    </section>
    ${terminalBlock('dashboard-ready.json', JSON.stringify(payload.state, null, 2))}
    ${terminalBlock('dashboard-active.json', payload.active)}
    ${terminalBlock('bluegreen-sync.log', payload.logs.bluegreen_sync)}
    ${terminalBlock('dashboard-candidate.log', payload.logs.dashboard_candidate)}
    ${terminalBlock('dashboard-running.json', payload.running)}
    ${terminalBlock('sync-handshake.log', payload.logs.sync_handshake)}
    ${terminalBlock('sync-history.log', payload.logs.sync_history)}
    ${terminalBlock('dashboard-supervisor.log', payload.logs.dashboard_supervisor)}
    ${terminalBlock('dashboard-runtime.log', payload.logs.dashboard_runtime)}
    ${terminalBlock('sync-handoff.log', payload.logs.sync_handoff)}
  </main>
</body>
</html>`;
}

function page() {
  const state = readState();
  const ready = state.state === 'ready';
  const appUrl = `http://127.0.0.1:${appPort}/sync`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="3" />
<title>AIFT Sync Handoff</title>
<style>
:root { color-scheme: dark; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at top, #182413, #07060a 62%); color: #fff7ea; font-family: system-ui, Arial, sans-serif; padding: 20px; }
.card { width: min(720px, 100%); border: 1px solid rgba(255,247,234,.14); border-radius: 28px; background: rgba(10,8,14,.88); box-shadow: 0 24px 80px rgba(0,0,0,.48); padding: 24px; }
.eyebrow { color: #e2b952; text-transform: uppercase; letter-spacing: .18em; font-size: .78rem; font-weight: 900; }
h1 { margin: .25rem 0 1rem; font-size: clamp(2rem, 9vw, 4rem); line-height: 1; }
.state { border: 1px solid ${ready ? 'rgba(84,214,138,.75)' : 'rgba(226,185,82,.55)'}; border-radius: 18px; padding: 16px; background: ${ready ? 'rgba(84,214,138,.12)' : 'rgba(226,185,82,.10)'}; margin: 18px 0; }
.state strong { color: ${ready ? '#d8ffe7' : '#ffe7a6'}; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
a { text-decoration: none; }
.btn { border: 1px solid rgba(255,247,234,.18); border-radius: 999px; padding: 12px 16px; color: #fff7ea; font-weight: 900; background: rgba(255,255,255,.05); }
.btn.ready { border-color: rgba(84,214,138,.85); background: rgba(84,214,138,.16); color: #d8ffe7; box-shadow: 0 0 28px rgba(84,214,138,.28); }
small { color: rgba(255,247,234,.62); }
</style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">AIFT Sync Handoff</div>
    <h1>${ready ? 'Dashboard ready' : 'Building candidate'}</h1>
    <p>This page stays alive while the candidate dashboard builds, health-checks, and promotes.</p>
    <section class="state">
      <strong>${escapeHtml(state.state || 'waiting')}</strong>
      <p>${escapeHtml(state.message || '')}</p>
      <small>${escapeHtml(state.updated_at || '')}</small>
    </section>
    <div class="actions">
      ${ready ? `<a class="btn ready" href="${appUrl}">Return to AIFT Cloud</a>` : `<a class="btn" href="/">Check again</a>`}
      <a class="btn" href="/status">Raw status</a>
      <a class="btn" href="/export">Export logs</a>
    </div>
  </main>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (req.url === '/export') {
    const text = exportBundle();
    const fileName = `aift-log-export-${new Date().toISOString().replaceAll(':', '-')}.txt`;
    res.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
      'content-disposition': `attachment; filename="${fileName}"`,
      'cache-control': 'no-store'
    });
    res.end(text);
    return;
  }
  if (req.url === '/status.json') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(statusPayload(), null, 2));
    return;
  }
  if (req.url === '/status') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(statusPage());
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(page());
});

server.listen(port, host, () => {
  console.log(`AIFT sync handoff: http://${host}:${port}`);
});
