import { existsSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { writeLocalActionLog } from '@/lib/local-action-log';

const actions = [
  { id: 'sync-handshake', label: 'Sync handshake' },
  { id: 'refresh-node', label: 'Refresh node from GitHub' },
  { id: 'restart-dashboard', label: 'Restart dashboard' },
  { id: 'write-heartbeat', label: 'Write heartbeat' },
  { id: 'list-services', label: 'List local services' },
  { id: 'check-engine-report', label: 'Check engine report' },
  { id: 'preview-status', label: 'Check preview status' },
] as const;

type ActionId = typeof actions[number]['id'];

function findRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(current, 'scripts')) && existsSync(path.join(current, 'apps'))) return current;
    current = path.dirname(current);
  }
  return process.cwd();
}

function runAction(action: ActionId) {
  const repoRoot = findRepoRoot();
  const appDir = path.join(repoRoot, 'apps', 'aift-dashboard');
  const home = process.env.HOME || '.';
  const baseHome = process.env.AIFT_HOME || `${home}/.aift-webai`;
  const restartLog = `${baseHome}/logs/dashboard-restart.log`;
  const handoffLog = `${baseHome}/logs/sync-handoff.log`;
  const handshakeLog = `${baseHome}/logs/sync-handshake.log`;
  const readyFile = `${baseHome}/runtime/dashboard-ready.json`;

  const command = (() => {
    switch (action) {
      case 'sync-handshake':
        return { cmd: 'bash', args: ['-lc', `mkdir -p ${baseHome}/logs ${baseHome}/runtime; printf '{"state":"syncing","message":"Sync handshake started. Keep the handoff page open.","updated_at":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > ${readyFile}; cd ${repoRoot}; (node scripts/aift-sync-handoff-server.mjs > ${handoffLog} 2>&1 &) ; (git pull --ff-only && printf '{"state":"starting","message":"Dashboard files synced. Restarting dashboard.","updated_at":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > ${readyFile} && sleep 1 && pkill -f "next dev" || true; rm -rf apps/aift-dashboard/.next; bash scripts/aift-start-dashboard.sh) > ${handshakeLog} 2>&1 & echo "Sync handshake scheduled. Open handoff URL: http://127.0.0.1:3999"`], cwd: repoRoot };
      case 'refresh-node':
        return { cmd: 'git', args: ['pull', '--ff-only'], cwd: repoRoot };
      case 'restart-dashboard':
        return { cmd: 'bash', args: ['-lc', `mkdir -p ${baseHome}/logs ${baseHome}/runtime; printf '{"state":"starting","message":"Dashboard restart is running. Keep this handoff page open.","updated_at":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > ${readyFile}; cd ${repoRoot}; (node scripts/aift-sync-handoff-server.mjs > ${handoffLog} 2>&1 &) ; (sleep 1; pkill -f "next dev" || true; rm -rf apps/aift-dashboard/.next; bash scripts/aift-start-dashboard.sh) > ${restartLog} 2>&1 & echo "Dashboard restart scheduled. Open handoff URL: http://127.0.0.1:3999"`], cwd: repoRoot };
      case 'write-heartbeat':
        return { cmd: 'bash', args: [path.join(repoRoot, 'scripts', 'aift-heartbeat-with-port.sh')], cwd: repoRoot };
      case 'list-services':
        return { cmd: 'bash', args: [path.join(repoRoot, 'scripts', 'aift-service-registry.sh'), 'list'], cwd: repoRoot };
      case 'check-engine-report':
        return { cmd: 'node', args: ['-e', "fetch('http://127.0.0.1:'+(process.env.APP_PORT||'3001')+'/api/engine/report').then(r=>r.text()).then(t=>console.log(t)).catch(e=>{console.error(e.message);process.exit(1)})"], cwd: appDir };
      case 'preview-status':
        return { cmd: 'bash', args: [path.join(repoRoot, 'scripts', 'aift-service-registry.sh'), 'list'], cwd: repoRoot };
    }
  })();

  const result = spawnSync(command.cmd, command.args, {
    cwd: command.cwd,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, AIFT_HOME: baseHome },
  });

  const terminal = [result.stdout || '', result.stderr || ''].filter(Boolean).join('\n') || 'No output returned.';
  const logPath = writeLocalActionLog(action, terminal);

  return {
    exit_code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    terminal,
    log_path: logPath,
  };
}

export async function GET() {
  return NextResponse.json({ ok: true, actions });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const action = body.action as ActionId;
  if (!actions.some((item) => item.id === action)) {
    return NextResponse.json({ ok: false, error: 'Action is not approved.' }, { status: 400 });
  }

  const result = runAction(action);
  return NextResponse.json({
    ok: result.exit_code === 0,
    action,
    terminal: result.terminal,
    log_path: result.log_path,
    exit_code: result.exit_code,
  });
}
