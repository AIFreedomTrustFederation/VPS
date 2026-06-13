import { NextResponse } from 'next/server';
import { getBuildRegistryPath, readBuilds } from '@/lib/builds';

export async function GET() {
  const builds = await readBuilds();
  return NextResponse.json({ ok: true, path: getBuildRegistryPath(), builds });
}
