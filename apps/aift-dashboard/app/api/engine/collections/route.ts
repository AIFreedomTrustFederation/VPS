import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';

const collections = [
  'app-sources',
  'app-profiles',
  'build-runs',
  'workloads',
  'provider-node-updates',
  'dependency-issues',
  'learning-events',
];

function engineHome() {
  return process.env.AIFT_HOME || path.join(homedir(), '.aift-webai');
}

function readCollection(collection: string) {
  const filePath = path.join(engineHome(), 'engine', collection, 'records.json');
  if (!existsSync(filePath)) return [];

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    return Array.isArray(data.records) ? data.records : [];
  } catch {
    return [];
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    collections: Object.fromEntries(collections.map((collection) => [collection.replaceAll('-', '_'), readCollection(collection)])),
  });
}
