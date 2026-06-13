import { NextResponse } from 'next/server';
import { readAppSources } from '@/lib/app-sources';
import { generateAppProfile } from '@/lib/app-profile-generator';

export async function GET(_request: Request, context: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await context.params;
  const source = readAppSources().find((item) => item.id === sourceId || item.repo.toLowerCase().replace(/[^a-z0-9]+/g, '-') === sourceId);

  if (!source) {
    return NextResponse.json({ ok: false, error: 'Source not found.' }, { status: 404 });
  }

  const result = await generateAppProfile(source);

  return NextResponse.json({
    ok: true,
    source,
    profile: result.profile,
    workload: result.workload,
  });
}

export async function POST(request: Request, context: { params: Promise<{ sourceId: string }> }) {
  return GET(request, context);
}
