import { NextResponse } from 'next/server';
import { config, isCoolifyConfigured } from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    registryPath: config.registryPath,
    logPath: config.logPath,
    coolifyConfigured: isCoolifyConfigured()
  });
}
