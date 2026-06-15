#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';

const listenPort = Number(process.env.AIFT_ROUTER_PORT || process.env.APP_PORT || 3001);
const listenHost = process.env.AIFT_ROUTER_HOST || '0.0.0.0';
const home = process.env.AIFT_HOME || path.join(os.homedir(), '.aift-webai');
const runtimeDir = path.join(home, 'runtime');
const activeFile = path.join(runtimeDir, 'dashboard-active.json');
const pidFile = path.join(runtimeDir, 'dashboard-router.pid');
const stateFile = path.join(runtimeDir, 'dashboard-router.json');

fs.mkdirSync(runtimeDir, { recursive: true });
fs.writeFileSync(pidFile, `${process.pid}\n`, 'utf8');

function now() {
  return new Date().toISOString();
}

function readActive() {
  try {
    const parsed = JSON.parse(fs.readFileSync(activeFile, 'utf8'));
    const port = Number(parsed.target_port || parsed.port || 3101);
    return {
      host: '127.0.0.1',
      port,
      commit: parsed.commit || 'unknown',
      branch: parsed.branch || 'unknown',
      updated_at: parsed.promoted_at || parsed.validated_at || '',
    };
  } catch {
    return {
      host: '127.0.0.1',
      port: Number(process.env.AIFT_FALLBACK_DASHBOARD_PORT || 3101),
      commit: 'unknown',
      branch: 'unknown',
      updated_at: '',
    };
  }
}

function writeState(extra = {}) {
  const target = readActive();
  fs.writeFileSync(stateFile, JSON.stringify({
    ok: true,
    service: 'aift-dashboard-router',
    listen_host: listenHost,
    listen_port: listenPort,
    active_target: target,
    checked_at: now(),
    ...extra,
  }, null, 2), 'utf8');
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function sendUnavailable(res, error, target) {
  sendJson(res, 502, {
    ok: false,
    error: 'Active dashboard target is unavailable.',
    detail: error instanceof Error ? error.message : String(error),
    target,
    checked_at: now(),
  });
}

function forwardToTarget(req, res, target) {
  const headers = { ...req.headers, host: `${target.host}:${target.port}` };
  const request = http.request({
    hostname: target.host,
    port: target.port,
    method: req.method,
    path: req.url || '/',
    headers,
  }, (response) => {
    res.writeHead(response.statusCode || 502, response.headers);
    response.pipe(res);
  });

  request.setTimeout(30000, () => {
    request.destroy(new Error('Active dashboard target timed out.'));
  });

  request.on('error', (error) => {
    sendUnavailable(res, error, target);
  });

  req.pipe(request);
}

writeState({ state: 'starting' });

const server = http.createServer((req, res) => {
  const target = readActive();

  if (req.url === '/__aift_router/status') {
    sendJson(res, 200, {
      ok: true,
      service: 'aift-dashboard-router',
      listen_host: listenHost,
      listen_port: listenPort,
      active_target: target,
      checked_at: now(),
    });
    return;
  }

  if (req.url === '/__aift_router/active') {
    sendJson(res, 200, target);
    return;
  }

  forwardToTarget(req, res, target);
});

server.listen(listenPort, listenHost, () => {
  writeState({ state: 'running' });
  console.log(`[AIFT Router] listening on http://${listenHost}:${listenPort}`);
  console.log(`[AIFT Router] active target file: ${activeFile}`);
});
