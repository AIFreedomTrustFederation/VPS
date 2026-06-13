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

function readSyncState(workspace: string, branch: string) {
  const remoteRef = `origin/${branch}`;
  const fetchResult = run('git', ['fetch', 'origin', branch], workspace);
  const countResult = run('git', ['rev-list', '--left-right', '--count', `HEAD...${remoteRef}`], workspace);
  const counts = (countResult.stdout || '').trim().split(/\s+/).map((item) => Number(item));
  const ahead = Number.isFinite(counts[0]) ? counts[0] : 0;
  const behind = Number.isFinite(counts[1]) ? counts[1] : 0;
  const status = ahead > 0 && behind > 0 ? 'diverged' : ahead > 0 ? 'ahead' : behind > 0 ? 'behind' : 'up-to-date';
  const text = [
    `$ git fetch origin ${branch}`,
    fetchResult.stdout || '',
    fetchResult.stderr || '',
    `$ git rev-list --left-right --count HEAD...${remoteRef}`,
    countResult.stdout || '',
    countResult.stderr || '',
    `Repository status: ${status}`,
    `Ahead: ${ahead}`,
    `Behind: ${behind}`,
  ].filter(Boolean).join('\n');
  return { status, ahead, behind, text };
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
  const branch = source.branch || 'main';
  mkdirSync(root, { recursive: true });

  const startedAt = new Date().toISOString();
  const repoUrl = `https://github.com/${source.repo}.git`;
  const hasRepo = existsSync(path.join(workspace, '.git'));
  const syncState = hasRepo ? readSyncState(workspace, branch) : { status: 'missing', ahead: 0, behind: 0, text: 'Repository status: missing locally' };
  const command = hasRepo
    ? { cmd: 'git', args: ['pull', '--ff-only'], cwd: workspace }
    : { cmd: 'git', args: ['clone', '--depth', '1', '--branch', branch, repoUrl, workspace], cwd: root };

  const result = syncState.status === 'ahead' || syncState.status === 'diverged'
    ? { status: 1, stdout: '', stderr: `Refusing automatic pull because workspace is ${syncState.status}.`, error: undefined }
    : run(command.cmd, command.args, command.cwd);

  const terminal = [syncState.text, `$ ${command.cmd} ${command.args.join(' ')}`, result.stdout || '', result.stderr || ''].filter(Boolean).join('\n');
  const logPath = writeLocalActionLog(`workspace-${source.id}`, terminal);
  const ok = result.status === 0;

  const record = {
    id: `workspace-${source.id}`,
    profile_id: profile.id,
    source_id: source.id,
    repo: source.repo,
    branch,
    status: ok ? 'workspace-ready' : 'workspace-failed',
    repo_status: ok ? 'up-to-date' : syncState.status,
    ahead: syncState.ahead,
    behind: syncState.behind,
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
