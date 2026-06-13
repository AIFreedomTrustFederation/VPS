import { NextResponse } from 'next/server';
import { readAppSources } from '@/lib/app-sources';
import { generateAppProfile } from '@/lib/app-profile-generator';

export async function POST() {
  const sources = readAppSources();
  const results = [];

  for (const source of sources) {
    results.push(await generateAppProfile(source));
  }

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    count: results.length,
    results,
  });
}

export async function GET() {
  return POST();
}
