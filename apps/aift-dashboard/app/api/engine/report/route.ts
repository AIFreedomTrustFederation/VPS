import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';

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
  const sources = readCollection('app-sources');
  const builds = readCollection('build-runs') as Array<{ status?: string }>;
  const nodeUpdates = readCollection('provider-node-updates') as Array<{ node_id?: string; status?: string }>;
  const issues = readCollection('dependency-issues');
  const learning = readCollection('learning-events') as Array<{ summary?: string }>;

  const activeBuilds = builds.filter((build) => ['requested', 'queued', 'running'].includes(build.status || ''));
  const passedBuilds = builds.filter((build) => build.status === 'passed');
  const failedBuilds = builds.filter((build) => build.status === 'failed');
  const activeNodes = new Set(nodeUpdates.filter((update) => update.status === 'healthy').map((update) => update.node_id).filter(Boolean));
  const staleNodes = new Set(nodeUpdates.filter((update) => ['stale', 'offline'].includes(update.status || '')).map((update) => update.node_id).filter(Boolean));

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    report: {
      date: new Date().toISOString().slice(0, 10),
      connected_sources: sources.length,
      active_builds: activeBuilds.length,
      successful_builds: passedBuilds.length,
      failed_builds: failedBuilds.length,
      active_nodes: activeNodes.size,
      stale_nodes: staleNodes.size,
      issues: issues.length,
      recommended_actions: [
        sources.length ? 'Review connected app sources.' : 'Add the first app source.',
        activeBuilds.length ? 'Check active build logs.' : 'No active builds are running.',
        issues.length ? 'Review recorded issues.' : 'No recorded issues.',
      ],
      learning_notes: learning.slice(0, 8).map((event) => event.summary).filter(Boolean),
    },
  });
}
