import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DASHBOARD = join(ROOT, 'apps/aift-dashboard');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('dashboard lockfile matches declared direct dependencies', () => {
  const manifest = readJson(join(DASHBOARD, 'package.json'));
  const lock = readJson(join(DASHBOARD, 'package-lock.json'));
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.name, manifest.name);
  assert.deepEqual(lock.packages[''].dependencies ?? {}, manifest.dependencies ?? {});
  assert.deepEqual(lock.packages[''].devDependencies ?? {}, manifest.devDependencies ?? {});
});

test('runner and Docker image install exactly the dashboard lockfile', () => {
  const workflow = readFileSync(join(ROOT, '.github/workflows/deploy-aift-dashboard.yml'), 'utf8');
  const dockerfile = readFileSync(join(DASHBOARD, 'Dockerfile'), 'utf8');
  assert.match(workflow, /- name: Install dependencies\s+run: npm ci --workspaces=false(?:\s|$)/);
  assert.match(dockerfile, /^RUN npm ci$/m);
  assert.doesNotMatch(dockerfile, /^RUN npm install(?:\s|$)/m);
});

test('npm ci isolates a workspace-local lockfile without a root lockfile', () => {
  const root = mkdtempSync(join(tmpdir(), 'aift-dashboard-lock-'));
  try {
    const app = join(root, 'apps/aift-dashboard');
    mkdirSync(app, { recursive: true });
    writeFileSync(join(root, 'package.json'), JSON.stringify({ private: true, workspaces: ['apps/aift-dashboard'] }));
    writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'aift-dashboard', version: '0.1.0' }));
    writeFileSync(join(app, 'package-lock.json'), JSON.stringify({
      name: 'aift-dashboard', version: '0.1.0', lockfileVersion: 3, requires: true,
      packages: { '': { name: 'aift-dashboard', version: '0.1.0' } },
    }));
    assert.equal(existsSync(join(root, 'package-lock.json')), false);
    const result = spawnSync('npm', ['ci', '--workspaces=false', '--offline', '--ignore-scripts', '--no-audit', '--no-fund'],
      { cwd: app, encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
