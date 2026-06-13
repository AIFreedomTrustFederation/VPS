import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { readEngineRecords, upsertEngineRecord } from '@/lib/engine-records';
import { writeLocalActionLog } from '@/lib/local-action-log';

type AppProfile = {
  id: string;
  source_id: string;
  repo: string;
  branch: string;
};

type AppSource = {
  id: string;
  repo: string;
  branch: string;
};

function aiftHome() {
  return process.env.AIFT_HOME || path.join(homedir(), '.aift-webai');
}

function workspacePath(sourceId: string) {
  return path.join(aiftHome(), 'workspaces', sourceId);
}

function run(cmd: string, args: string[], cwd: string) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout: 120000,
    env: process.env,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const profileId = typeof body.profileId === 'string' ? body.profileId : '';

  if (!profileId) {
    return NextResponse.json({ ok: false, error: 'Profile id is required.' }, { status: 400 });
  }

  const profiles = readEngineRecords<AppProfile>('app-profiles');
  const sources = readEngineRecords<AppSource>('app-sources');
  const profile = profiles.find((item) => item.id === profileId);

  if (!profile) {
    return NextResponse.json({ ok: false, error: 'Profile not found.' }, { status: 404 });
  }

  const source = sources.find((item) => item.id === profile.source_id) || {
    id: profile.source_id,
    repo: profile.repo,
    branch: profile.branch || 'main',
  };

  const root = path.join(aiftHome(), 'workspaces');
  const workspace = workspacePath(source.id);
  mkdirSync(root, { recursive: true });

  const startedAt = new Date().toISOString();
  const repoUrl = `https://github.com/${source.repo}.git`;
  const command = existsSync(path.join(workspace, '.git'))
    ? { cmd: 'git', args: ['pull', '--ff-only'], cwd: workspace }
    : { cmd: 'git', args: ['clone', '--depth', '1', '--branch', source.branch || 'main', repoUrl, workspace], cwd: root };

  const result = run(command.cmd, command.args, command.cwd);
  const terminal = [`$ ${command.cmd} ${command.args.join(' ')}`, result.stdout || '', result.stderr || ''].filter(Boolean).join('\n');
  const logPath = writeLocalActionLog(`workspace-${source.id}`, terminal);
  const ok = result.status === 0;

  const record = {
    id: `workspace-${source.id}`,
    profile_id: profile.id,
    source_id: source.id,
    repo: source.repo,
    branch: source.branch || 'main',
    status: ok ? 'workspace-ready' : 'workspace-failed',
    workspace_path: workspace,
    log_path: logPath,
    created_at: startedAt,
    updated_at: new Date().toISOString(),
  };

  upsertEngineRecord('workloads', record);

  return NextResponse.json({
    ok,
    profile,
    source,
    workspace: record,
    terminal,
    exit_code: result.status,
  }, { status: ok ? 200 : 500 });
}
