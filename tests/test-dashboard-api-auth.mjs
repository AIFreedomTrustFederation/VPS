// Dashboard API auth policy: proxy gate, constant-time token checks, local-exec opt-in, loopback bind.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dashboard = join(root, 'apps/aift-dashboard');
const policy = await import(join(dashboard, 'lib/api-auth-policy.ts'));
const execPolicy = await import(join(dashboard, 'lib/local-exec-policy.ts'));

const TOKEN = 'test-only-dashboard-token-0123456789';
const base = { pathname: '/api/rebuild', host: 'vps.example.test' };

test('safe methods pass without credentials', () => {
  for (const method of ['GET', 'HEAD', 'OPTIONS']) {
    assert.deepEqual(policy.authorizeApiRequest({ ...base, method }, TOKEN), { ok: true, via: 'safe-method' });
  }
});

test('every mutating method needs credentials', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'post']) {
    const decision = policy.authorizeApiRequest({ ...base, method }, TOKEN);
    assert.equal(decision.ok, false, method);
    assert.equal(decision.status, 401);
    assert.match(decision.error, /\/login/);
  }
});

test('mutating requests fail closed when no dashboard token is configured', () => {
  const decision = policy.authorizeApiRequest({ ...base, method: 'POST', authorization: 'Bearer ' }, '');
  assert.equal(decision.ok, false);
  assert.equal(decision.status, 503);
  assert.equal(policy.authorizeApiRequest({ ...base, method: 'POST', authorization: 'Bearer anything' }, '').ok, false);
});

test('bearer token must match exactly', () => {
  assert.deepEqual(policy.authorizeApiRequest({ ...base, method: 'POST', authorization: `Bearer ${TOKEN}` }, TOKEN), { ok: true, via: 'bearer' });
  assert.equal(policy.authorizeApiRequest({ ...base, method: 'POST', authorization: `bearer   ${TOKEN}  ` }, TOKEN).ok, true);
  for (const bad of [`Bearer ${TOKEN}x`, `Bearer ${TOKEN.slice(0, -1)}`, 'Bearer ', TOKEN, `Basic ${TOKEN}`]) {
    assert.equal(policy.authorizeApiRequest({ ...base, method: 'POST', authorization: bad }, TOKEN).ok, false, bad);
  }
});

test('session cookie works same-origin and is rejected cross-origin or when stale', () => {
  const cookie = policy.sessionValueForToken(TOKEN);
  assert.notEqual(cookie, TOKEN, 'raw token must not be stored in the cookie');
  const ok = policy.authorizeApiRequest({ ...base, method: 'POST', sessionCookie: cookie, origin: 'https://vps.example.test' }, TOKEN);
  assert.deepEqual(ok, { ok: true, via: 'session' });
  assert.equal(policy.authorizeApiRequest({ ...base, method: 'POST', sessionCookie: cookie }, TOKEN).ok, true, 'form post without Origin');
  assert.equal(policy.authorizeApiRequest({ ...base, host: '127.0.0.1:3000', forwardedHost: 'vps.example.test', method: 'POST', sessionCookie: cookie, origin: 'https://vps.example.test' }, TOKEN).ok, true, 'behind a proxy');
  const cross = policy.authorizeApiRequest({ ...base, method: 'POST', sessionCookie: cookie, origin: 'https://evil.example' }, TOKEN);
  assert.equal(cross.ok, false);
  assert.equal(cross.status, 403);
  assert.equal(policy.authorizeApiRequest({ ...base, method: 'POST', sessionCookie: cookie, origin: 'null' }, TOKEN).ok, false);
  const stale = policy.authorizeApiRequest({ ...base, method: 'POST', sessionCookie: policy.sessionValueForToken('old-token') }, TOKEN);
  assert.equal(stale.ok, false);
  assert.equal(stale.status, 401);
});

test('allowlist is exact: only heartbeat and session sign-in/out skip the gate', () => {
  assert.deepEqual(policy.PUBLIC_MUTATING_API_ROUTES.map((r) => `${r.method} ${r.path}`).sort(), [
    'DELETE /api/session', 'POST /api/nodes/heartbeat', 'POST /api/session',
  ]);
  assert.equal(policy.authorizeApiRequest({ method: 'POST', pathname: '/api/nodes/heartbeat' }, TOKEN).ok, true);
  assert.equal(policy.authorizeApiRequest({ method: 'POST', pathname: '/api/nodes/heartbeat/' }, TOKEN).ok, true);
  for (const pathname of ['/api/nodes/heartbeat/x', '/api/nodes/heartbeatx', '/api/nodes%2Fheartbeat', '/api/health', '/api/nodes', '/api/sessions']) {
    assert.equal(policy.authorizeApiRequest({ method: 'POST', pathname }, TOKEN).ok, false, pathname);
  }
  assert.equal(policy.authorizeApiRequest({ method: 'PUT', pathname: '/api/nodes/heartbeat' }, TOKEN).ok, false);
});

test('safeEqual is correct for equal, unequal and different-length inputs', () => {
  assert.equal(policy.safeEqual('abc', 'abc'), true);
  assert.equal(policy.safeEqual('abc', 'abd'), false);
  assert.equal(policy.safeEqual('abc', 'abcd'), false);
  assert.equal(policy.safeEqual('', 'x'), false);
});

test('local-exec routes default off in production, on in development, explicit flag wins', () => {
  const on = execPolicy.localExecRoutesEnabled;
  assert.equal(on({ NODE_ENV: 'production' }), false);
  assert.equal(on({ NODE_ENV: 'production', AIFT_ENABLE_LOCAL_EXEC_ROUTES: '' }), false);
  assert.equal(on({ NODE_ENV: 'production', AIFT_ENABLE_LOCAL_EXEC_ROUTES: 'maybe' }), false);
  assert.equal(on({ NODE_ENV: 'production', AIFT_ENABLE_LOCAL_EXEC_ROUTES: '1' }), true);
  assert.equal(on({ NODE_ENV: 'production', AIFT_ENABLE_LOCAL_EXEC_ROUTES: 'TRUE' }), true);
  assert.equal(on({ NODE_ENV: 'development' }), true);
  assert.equal(on({ NODE_ENV: 'development', AIFT_ENABLE_LOCAL_EXEC_ROUTES: 'off' }), false);
});

test('child processes get a minimal env without dashboard secrets', () => {
  const env = execPolicy.minimalChildEnv({
    PATH: '/usr/bin', HOME: '/home/n', AIFT_DASHBOARD_TOKEN: 's1', AIFT_NODE_TOKEN: 's2',
    COOLIFY_API_TOKEN: 's3', GITHUB_TOKEN: 's4', NODE_OPTIONS: '--require /tmp/x.js',
  }, { PORT: '4100' });
  assert.deepEqual(env, { PATH: '/usr/bin', HOME: '/home/n', PORT: '4100' });
});

function routeFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? routeFiles(full) : name === 'route.ts' ? [full] : [];
  });
}

test('proxy gates all /api routes and dangerous routes are opt-in with minimal env', () => {
  const proxy = readFileSync(join(dashboard, 'proxy.ts'), 'utf8');
  assert.match(proxy, /export function proxy\(/);
  assert.match(proxy, /matcher:\s*\['\/api\/:path\*'\]/);
  assert.match(proxy, /authorizeApiRequest\(/);

  const dangerous = [
    'workspaces/prepare', 'workspaces/install', 'workspaces/run-build', 'workspaces/start-preview',
    'local-actions', 'app-sources',
  ];
  for (const name of dangerous) {
    const src = readFileSync(join(dashboard, 'app/api', name, 'route.ts'), 'utf8');
    const post = src.slice(src.indexOf('export async function POST'));
    assert.match(post.split('\n').slice(0, 3).join('\n'), /guardLocalExecRoute\(request\)/, `${name} must guard first`);
    if (name.startsWith('workspaces/')) assert.doesNotMatch(src, /\.\.\.process\.env|env:\s*process\.env/, `${name} must not pass process.env`);
  }

  const rebuild = readFileSync(join(dashboard, 'app/api/rebuild/route.ts'), 'utf8');
  assert.ok(rebuild.indexOf('requireApiAuth(request)') < rebuild.indexOf('request.formData()'), 'rebuild must authenticate form posts');

  // Every mutating handler is either behind the proxy gate or explicitly allowlisted.
  const allow = new Set(policy.PUBLIC_MUTATING_API_ROUTES.map((r) => r.path));
  for (const file of routeFiles(join(dashboard, 'app/api'))) {
    const src = readFileSync(file, 'utf8');
    const path = '/' + relative(join(dashboard, 'app'), file).replace(/\/route\.ts$/, '');
    if (/export async function (POST|PUT|PATCH|DELETE)/.test(src) && allow.has(path)) {
      assert.ok(path === '/api/session' || /AIFT_NODE_TOKEN/.test(src), `${path} is allowlisted but has no own auth`);
    }
  }
});

test('compose publishes the dashboard on loopback only', () => {
  const compose = readFileSync(join(dashboard, 'compose.yml'), 'utf8');
  assert.match(compose, /-\s*"127\.0\.0\.1:3000:3000"/);
  assert.doesNotMatch(compose, /-\s*"3000:3000"/);
});
