import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { readEngineRecords, upsertEngineRecord } from '@/lib/engine-records';
import { writeLocalActionLog } from '@/lib/local-action-log';

type Profile = { id: string; source_id: string; repo: string; package_manager: string; build_command: string };
type Workload = { id: string; profile_id?: string; source_id?: string; repo?: string; status?: string; workspace_path?: string; log_path?: string };

function commandFor(manager: string) {
  if (manager === 'pnpm') return { cmd: 'pnpm', args: ['build'] };
  if (manager === 'yarn') return { cmd: 'yarn', args: ['build'] };
  return { cmd: 'npm', args: ['run', 'build'] };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const profileId = typeof body.profileId === 'string' ? body.profileId : '';
  const profile = readEngineRecords<Profile>('app-profiles').find((item) => item.id === profileId);

  if (!profile) return NextResponse.json({ ok: false, error: 'Profile not found.' }, { status: 404 });
  if (!profile.build_command) return NextResponse.json({ ok: false, error: 'No build command detected.' }, { status: 400 });

  const ready = readEngineRecords<Workload>('workloads').find((item) => item.profile_id === profile.id && item.status === 'dependencies-installed' && item.workspace_path);
  if (!ready?.workspace_path || !existsSync(ready.workspace_path)) return NextResponse.json({ ok: false, error: 'Install dependencies before running build.' }, { status: 400 });

  const command = commandFor(profile.package_manager);
  const result = spawnSync(command.cmd, command.args, { cwd: ready.workspace_path, encoding: 'utf8', timeout: 300000, env: process.env });
  const terminal = [`$ ${command.cmd} ${command.args.join(' ')}`, result.stdout || '', result.stderr || ''].filter(Boolean).join('\n');
  const logPath = writeLocalActionLog(`build-${profile.source_id}`, terminal);
  const ok = result.status === 0;

  const workload = {
    id: `build-${profile.source_id}`,
    profile_id: profile.id,
    source_id: profile.source_id,
    repo: profile.repo,
    status: ok ? 'build-complete' : 'build-failed',
    workspace_path: ready.workspace_path,
    log_path: logPath,
    updated_at: new Date().toISOString(),
  };

  upsertEngineRecord('workloads', workload);
  return NextResponse.json({ ok, profile, workload, terminal, exit_code: result.status }, { status: ok ? 200 : 500 });
}
