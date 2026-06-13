#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';

const port = Number(process.env.AIFT_HANDOFF_PORT || 3999);
const host = process.env.AIFT_HANDOFF_HOST || '127.0.0.1';
const appPort = process.env.APP_PORT || '3001';
const home = process.env.AIFT_HOME || path.join(os.homedir(), '.aift-webai');
const readyFile = path.join(home, 'runtime', 'dashboard-ready.json');

function readState() {
  try {
    return JSON.parse(fs.readFileSync(readyFile, 'utf8'));
  } catch {
    return { state: 'waiting', message: 'Waiting for dashboard restart status.', updated_at: '' };
  }
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
    <h1>${ready ? 'Dashboard ready' : 'Rebuilding dashboard'}</h1>
    <p>This page stays alive while the main AIFT dashboard restarts, so you do not have to reload too early.</p>
    <section class="state">
      <strong>${state.state || 'waiting'}</strong>
      <p>${state.message || ''}</p>
      <small>${state.updated_at || ''}</small>
    </section>
    <div class="actions">
      ${ready ? `<a class="btn ready" href="${appUrl}">Return to AIFT Cloud</a>` : `<a class="btn" href="/">Check again</a>`}
      <a class="btn" href="/status">Raw status</a>
    </div>
  </main>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(readState(), null, 2));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(page());
});

server.listen(port, host, () => {
  console.log(`AIFT sync handoff: http://${host}:${port}`);
});
