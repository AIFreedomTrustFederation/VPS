import { existsSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';

const actions = [
  { id: 'refresh-node', label: 'Refresh node from GitHub' },
  { id: 'write-heartbeat', label: 'Write heartbeat' },
  { id: 'list-services', label: 'List local services' },
  { id: 'check-engine-report', label: 'Check engine report' },
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

  const command = (() => {
    switch (action) {
      case 'refresh-node':
        return { cmd: 'git', args: ['pull', '--ff-only'], cwd: repoRoot };
      case 'write-heartbeat':
        return { cmd: 'bash', args: [path.join(repoRoot, 'scripts', 'aift-heartbeat-with-port.sh')], cwd: repoRoot };
      case 'list-services':
        return { cmd: 'bash', args: [path.join(repoRoot, 'scripts', 'aift-service-registry.sh'), 'list'], cwd: repoRoot };
      case 'check-engine-report':
        return { cmd: 'node', args: ['-e', "fetch('http://127.0.0.1:'+(process.env.APP_PORT||'3001')+'/api/engine/report').then(r=>r.text()).then(t=>console.log(t)).catch(e=>{console.error(e.message);process.exit(1)})"], cwd: appDir };
    }
  })();

  const result = spawnSync(command.cmd, command.args, {
    cwd: command.cwd,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, AIFT_HOME: process.env.AIFT_HOME || `${process.env.HOME}/.aift-webai` },
  });

  return {
    exit_code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
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
    terminal: [result.stdout, result.stderr].filter(Boolean).join('\n'),
    exit_code: result.exit_code,
  });
}
