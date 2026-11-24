import { NextRequest, NextResponse } from 'next/server';
import { guardLocalExecRoute } from '@/lib/local-exec';
import { addAppSource, readAppSources } from '@/lib/app-sources';

export async function GET() {
  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    sources: readAppSources(),
  });
}

export async function POST(request: NextRequest) {
  const blocked = guardLocalExecRoute(request);
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const url = typeof body.url === 'string' ? body.url : '';
  const result = addAppSource(url);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    created: result.created,
    source: result.source,
    sources: readAppSources(),
  });
}
