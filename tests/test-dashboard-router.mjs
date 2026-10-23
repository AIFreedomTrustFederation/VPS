import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

async function freePort() {
  const s = createNetServer();
  s.listen(0, '127.0.0.1');
  await once(s, 'listening');
  const port = s.address().port;
  await new Promise((resolve) => s.close(resolve));
  return port;
}

async function startUpstream() {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(`routed:${req.url}`);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server;
}

async function awaitReady(child, port) {
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error(`router exited early: ${child.exitCode}`);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/__aift_router/status`);
      if (res.status === 200) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('router did not become ready');
}

test('malformed active target returns 502 without terminating router; valid target still proxies', { timeout: 15000 }, async () => {
  const home = mkdtempSync(join(tmpdir(), 'aift-router-'));
  const runtime = join(home, 'runtime');
  mkdirSync(runtime);
  const activeFile = join(runtime, 'dashboard-active.json');
  writeFileSync(activeFile, JSON.stringify({ target_port: -1, commit: 'abc' }));
  const port = await freePort();
  const upstream = await startUpstream();
  const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/aift-dashboard-router.mjs', import.meta.url))], {
    env: { ...process.env, AIFT_HOME: home, AIFT_ROUTER_PORT: String(port), AIFT_ROUTER_HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let errors = '';
  child.stderr.on('data', c => { errors += c.toString(); });
  try {
    await awaitReady(child, port);
    for (const badPort of [-1, 0, 65536, 'not-a-port', 1.5]) {
      writeFileSync(activeFile, JSON.stringify({ target_port: badPort, commit: 'abc' }));
      const status = await fetch(`http://127.0.0.1:${port}/__aift_router/status`);
      assert.equal(status.status, 200);
      assert.equal((await status.json()).ok, false, `bad port ${badPort} should not report ready`);
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      assert.equal(response.status, 502, `expected 502 for bad port ${badPort}; stderr=${errors}`);
      const payload = await response.json();
      assert.equal(payload.ok, false);
      assert.equal(child.exitCode, null, `router crashed: ${errors}`);
    }
    writeFileSync(activeFile, JSON.stringify({ target_port: upstream.address().port, commit: 'def' }));
    const recovered = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(recovered.status, 200);
    assert.equal(await recovered.text(), 'routed:/health');
    writeFileSync(activeFile, JSON.stringify({ port: upstream.address().port, commit: 'ghi' }));
    const legacy = await fetch(`http://127.0.0.1:${port}/legacy`);
    assert.equal(legacy.status, 200);
    assert.equal(await legacy.text(), 'routed:/legacy');
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => { if (child.exitCode !== null) resolve(); else child.once('exit', resolve); });
    await new Promise(resolve => upstream.close(resolve));
    rmSync(home, { recursive: true, force: true });
  }
});
