import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { readEngineRecords, upsertEngineRecord } from '@/lib/engine-records';
import { writeLocalActionLog } from '@/lib/local-action-log';

type AppProfile = {
  id: string;
  source_id: string;
  repo: string;
  package_manager: string;
  install_command: string;
};

type WorkloadRecord = {
  id: string;
  profile_id?: string;
  source_id?: string;
  repo?: string;
  status?: string;
  workspace_path?: string;
  log_path?: string;
  created_at?: string;
  updated_at?: string;
};

function installCommand(packageManager: string) {
  if (packageManager === 'pnpm') return { cmd: 'pnpm', args: ['install'] };
  if (packageManager === 'yarn') return { cmd: 'yarn', args: ['install'] };
  return { cmd: 'npm', args: ['install'] };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const profileId = typeof body.profileId === 'string' ? body.profileId : '';

  if (!profileId) {
    return NextResponse.json({ ok: false, error: 'Profile id is required.' }, { status: 400 });
  }

  const profiles = readEngineRecords<AppProfile>('app-profiles');
  const workloads = readEngineRecords<WorkloadRecord>('workloads');
  const profile = profiles.find((item) => item.id === profileId);

  if (!profile) {
    return NextResponse.json({ ok: false, error: 'Profile not found.' }, { status: 404 });
  }

  const workspace = workloads.find((item) => item.profile_id === profile.id && item.workspace_path)?.workspace_path;

  if (!workspace || !existsSync(workspace)) {
    return NextResponse.json({ ok: false, error: 'Prepare workspace before installing dependencies.' }, { status: 400 });
  }

  const command = installCommand(profile.package_manager);
  const result = spawnSync(command.cmd, command.args, {
    cwd: workspace,
    encoding: 'utf8',
    timeout: 300000,
    env: process.env,
  });

  const terminal = [`$ ${command.cmd} ${command.args.join(' ')}`, result.stdout || '', result.stderr || ''].filter(Boolean).join('\n');
  const logPath = writeLocalActionLog(`install-${profile.source_id}`, terminal);
  const ok = result.status === 0;
  const timestamp = new Date().toISOString();

  const record = {
    id: `install-${profile.source_id}`,
    profile_id: profile.id,
    source_id: profile.source_id,
    repo: profile.repo,
    status: ok ? 'dependencies-installed' : 'dependency-install-failed',
    workspace_path: workspace,
    log_path: logPath,
    install_command: profile.install_command || `${command.cmd} ${command.args.join(' ')}`,
    created_at: timestamp,
    updated_at: timestamp,
  };

  upsertEngineRecord('workloads', record);

  return NextResponse.json({
    ok,
    profile,
    workload: record,
    terminal,
    exit_code: result.status,
  }, { status: ok ? 200 : 500 });
}
