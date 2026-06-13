import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';

function serviceFile() {
  const aiftHome = process.env.AIFT_HOME || path.join(homedir(), '.aift-webai');
  return path.join(aiftHome, 'runtime', 'services', 'services.jsonl');
}

function readServices() {
  const filePath = serviceFile();
  if (!existsSync(filePath)) return [];

  return readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    services: readServices(),
  });
}
