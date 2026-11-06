import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const dashboard = join(root, 'apps/aift-dashboard');
const compose = readFileSync(join(dashboard, 'compose.yml'), 'utf8');
const example = readFileSync(join(dashboard, '.env.example'), 'utf8');
const tokenNames = ['AIFT_DASHBOARD_TOKEN', 'AIFT_NODE_TOKEN'];

function composeConfig(dir, tokenValues) {
  const env = { ...process.env, ...tokenValues };
  for (const name of tokenNames) {
    if (!Object.hasOwn(tokenValues, name)) delete env[name];
  }
  const result = spawnSync('docker', ['compose', '-f', 'compose.yml', 'config', '--format', 'json'], {
    cwd: dir, env, encoding: 'utf8', timeout: 20000,
  });
  assert.equal(result.status, 0, `docker compose config failed: ${result.stderr || result.error}`);
  return JSON.parse(result.stdout).services['aift-dashboard'].environment;
}

test('dashboard Compose supplies no public fallback bearer credentials', () => {
  for (const name of tokenNames) {
    assert.ok(compose.includes(`${name}: \${${name}:-}`), `${name} must default to empty`);
    assert.doesNotMatch(compose, new RegExp(`${name}:\\s*\\$\\{${name}:-[^}]+\\}`));
  }
});

test('sample environment cannot enable authentication with copied placeholders', () => {
  for (const name of tokenNames) {
    assert.match(example, new RegExp(`^${name}=""$`, 'm'), `${name} must be blank in sample env`);
  }
});

test('both API handlers already reject missing bearer-token configuration', () => {
  const dashboardAuth = readFileSync(join(dashboard, 'lib/auth.ts'), 'utf8');
  const heartbeat = readFileSync(join(dashboard, 'app/api/nodes/heartbeat/route.ts'), 'utf8');
  assert.match(dashboardAuth, /if\s*\(!config\.dashboardToken\)/);
  assert.match(heartbeat, /if\s*\(!expected\)/);
  assert.match(heartbeat, /status:\s*503/);
});

test('Docker Compose resolves absent credentials to empty and supplied credentials unchanged', t => {
  const probe = spawnSync('docker', ['compose', 'version'], { encoding: 'utf8', timeout: 10000 });
  if (probe.status !== 0) {
    if (process.env.GITHUB_ACTIONS === 'true') {
      assert.fail(`hosted CI must have Docker Compose: ${probe.stderr || probe.error}`);
    }
    t.skip('Docker Compose is unavailable locally');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'aift-compose-auth-'));
  try {
    copyFileSync(join(dashboard, 'compose.yml'), join(dir, 'compose.yml'));
    const absent = composeConfig(dir, {});
    for (const name of tokenNames) assert.equal(absent[name], '', `${name} must be unset`);
    const configured = {
      AIFT_DASHBOARD_TOKEN: 'test-only-dashboard-unique-cred',
      AIFT_NODE_TOKEN: 'test-only-node-unique-cred',
    };
    const present = composeConfig(dir, configured);
    for (const name of tokenNames) assert.equal(present[name], configured[name]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
