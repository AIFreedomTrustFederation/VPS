import { NextResponse } from 'next/server';
import { getHealthChecks, summarizeHealth } from '@/lib/health';

// The deployed commit baked into the image (see Dockerfile); never trusted from the request.
function deployedCommit() {
  const value = process.env.AIFT_COMMIT_SHA || '';
  return /^[0-9a-f]{40}$/.test(value) ? value : 'unknown';
}

export async function GET() {
  const checks = await getHealthChecks();
  const status = summarizeHealth(checks);

  return NextResponse.json({
    ok: status !== 'broken',
    status,
    checked_at: new Date().toISOString(),
    commit: deployedCommit(),
    checks
  }, {
    status: status === 'broken' ? 500 : 200
  });
}
