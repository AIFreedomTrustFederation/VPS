import { NextResponse } from 'next/server';
import { getHealthChecks, summarizeHealth } from '@/lib/health';

export async function GET() {
  const checks = await getHealthChecks();
  const status = summarizeHealth(checks);

  return NextResponse.json({
    ok: status !== 'broken',
    status,
    checked_at: new Date().toISOString(),
    checks
  }, {
    status: status === 'broken' ? 500 : 200
  });
}
