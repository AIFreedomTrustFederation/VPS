import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';

function baseDir() {
  return path.join(process.env.AIFT_HOME || path.join(homedir(), '.aift-webai'), 'runtime');
}

function readJson(name: string) {
  const file = path.join(baseDir(), name);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return { unreadable: true };
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    phone_url: readJson('phone-url.json'),
    node_identity: readJson('node-identity.json'),
    router: readJson('dashboard-router.json'),
    active_dashboard: readJson('dashboard-active.json'),
    ready: readJson('dashboard-ready.json'),
    running: readJson('dashboard-running.json'),
  });
}
