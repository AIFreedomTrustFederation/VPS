import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';

function statusPath() {
  return path.join(process.env.AIFT_HOME || path.join(homedir(), '.aift-webai'), 'runtime', 'dashboard-ready.json');
}

export async function GET() {
  const file = statusPath();
  let state = 'unknown';
  let updated_at = '';
  let message = 'No dashboard restart has been recorded yet.';

  if (existsSync(file)) {
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      state = data.state || state;
      updated_at = data.updated_at || updated_at;
      message = data.message || message;
    } catch {
      state = 'unreadable';
      message = 'The dashboard status file exists but could not be read.';
    }
  }

  return NextResponse.json({ ok: true, state, updated_at, message });
}
