import { NextResponse } from 'next/server';
import { readRegistry } from '@/lib/registry';

export async function GET() {
  const apps = await readRegistry();
  return NextResponse.json({ ok: true, apps });
}
