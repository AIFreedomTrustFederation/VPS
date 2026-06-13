import { existsSync, readdirSync, readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';

function logDir() {
  const aiftHome = process.env.AIFT_HOME || path.join(homedir(), '.aift-webai');
  return path.join(aiftHome, 'webai', 'terminal-logs');
}

export async function GET() {
  const dir = logDir();
  if (!existsSync(dir)) {
    return NextResponse.json({ ok: true, logs: [], latest: '' });
  }

  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.log'))
    .map((name) => {
      const filePath = path.join(dir, name);
      return {
        name,
        path: filePath,
        content: readFileSync(filePath, 'utf8').slice(-12000),
      };
    });

  const latestPath = path.join(dir, 'latest.log');
  const latest = existsSync(latestPath) ? readFileSync(latestPath, 'utf8').slice(-12000) : '';

  return NextResponse.json({ ok: true, logs: files, latest });
}
