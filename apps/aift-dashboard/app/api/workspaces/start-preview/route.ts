import { existsSync, appendFileSync, mkdirSync, openSync, closeSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import net from 'net';
import { spawn } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { readEngineRecords, upsertEngineRecord } from '@/lib/engine-records';

type Profile = { id: string; source_id: string; repo: string; framework: string; package_manager: string; dev_command: string };
type Workload = { id: string; profile_id?: string; source_id?: string; repo?: string; status?: string; workspace_path?: string; log_path?: string };

function home() { return process.env.AIFT_HOME || path.join(homedir(), '.aift-webai'); }
function logFile(sourceId: string) { const dir = path.join(home(), 'preview-logs'); mkdirSync(dir, { recursive: true }); return path.join(dir, `${sourceId}.log`); }
function serviceFile() { const dir = path.join(home(), 'runtime', 'services'); mkdirSync(dir, { recursive: true }); return path.join(dir, 'services.jsonl'); }

function available(port: number) {
  return new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

async function nextPort() {
  for (let port = 4100; port < 4300; port += 1) if (await available(port)) return port;
  throw new Error('No preview port is available.');
}

function devCommand(profile: Profile, port: number) {
  if (profile.framework === 'vite') {
    if (profile.package_manager === 'pnpm') return { cmd: 'pnpm', args: ['dev', '--', '--host', '127.0.0.1', '--port', String(port)] };
    if (profile.package_manager === 'yarn') return { cmd: 'yarn', args: ['dev', '--host', '127.0.0.1', '--port', String(port)] };
    return { cmd: 'npm', args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)] };
  }
  if (profile.package_manager === 'pnpm') return { cmd: 'pnpm', args: ['dev', '--', '--hostname', '127.0.0.1', '--port', String(port)] };
  if (profile.package_manager === 'yarn') return { cmd: 'yarn', args: ['dev', '--hostname', '127.0.0.1', '--port', String(port)] };
  return { cmd: 'npm', args: ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)] };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const profileId = typeof body.profileId === 'string' ? body.profileId : '';
  const profile = readEngineRecords<Profile>('app-profiles').find((item) => item.id === profileId);
  if (!profile) return NextResponse.json({ ok: false, error: 'Profile not found.' }, { status: 404 });
  if (!profile.dev_command) return NextResponse.json({ ok: false, error: 'No dev command detected.' }, { status: 400 });

  const ready = readEngineRecords<Workload>('workloads').find((item) => item.profile_id === profile.id && item.status === 'build-complete' && item.workspace_path);
  if (!ready?.workspace_path || !existsSync(ready.workspace_path)) return NextResponse.json({ ok: false, error: 'Run build before starting preview.' }, { status: 400 });

  const port = await nextPort();
  const url = `http://127.0.0.1:${port}`;
  const command = devCommand(profile, port);
  const logPath = logFile(profile.source_id);
  appendFileSync(logPath, `\n$ ${command.cmd} ${command.args.join(' ')}\n`);
  const out = openSync(logPath, 'a');
  const child = spawn(command.cmd, command.args, { cwd: ready.workspace_path, detached: true, stdio: ['ignore', out, out], env: { ...process.env, PORT: String(port) } });
  child.unref();
  closeSync(out);

  const service = { service: `preview-${profile.source_id}`, profile_id: profile.id, source_id: profile.source_id, repo: profile.repo, status: 'running', port, url, pid: child.pid, updated_at: new Date().toISOString() };
  appendFileSync(serviceFile(), `${JSON.stringify(service)}\n`);

  const workload = { id: `preview-${profile.source_id}`, profile_id: profile.id, source_id: profile.source_id, repo: profile.repo, status: 'preview-running', workspace_path: ready.workspace_path, log_path: logPath, preview_url: url, preview_port: port, updated_at: new Date().toISOString() };
  upsertEngineRecord('workloads', workload);
  return NextResponse.json({ ok: true, profile, workload, service, terminal: `Started ${url}\nLog: ${logPath}` });
}
