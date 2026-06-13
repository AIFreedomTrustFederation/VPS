import { NextRequest, NextResponse } from 'next/server';

function getBearerToken(request: NextRequest) {
  return (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

export async function POST(request: NextRequest) {
  const expected = process.env.AIFT_NODE_TOKEN || '';
  const token = getBearerToken(request);

  if (!expected) {
    return NextResponse.json({ ok: false, error: 'AIFT_NODE_TOKEN is not configured.' }, { status: 503 });
  }

  if (token !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized node heartbeat.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const node = String(body?.node || '');

  if (!node) {
    return NextResponse.json({ ok: false, error: 'Missing node name.' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    accepted: true,
    node,
    received_at: new Date().toISOString(),
    message: 'Heartbeat accepted. Persistence will be enabled in the registry/database layer.'
  });
}
