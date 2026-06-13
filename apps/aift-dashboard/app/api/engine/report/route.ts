import { NextResponse } from 'next/server';
import { generateOperatorReport } from '@/../packages/aift-engine-core/src/engine';

export async function GET() {
  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    report: generateOperatorReport(),
  });
}
