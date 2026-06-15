import { NextRequest, NextResponse } from 'next/server';
import { listFederationNodes, upsertFederationNode } from '@/lib/federation-registry';

export async function GET() {
  const nodes = await listFederationNodes();
  return NextResponse.json({ ok: true, nodes, count: nodes.length, checked_at: new Date().toISOString() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  try {
    const node = await upsertFederationNode({
      node_id: String(body.node_id || ''),
      name: String(body.name || body.node_id || ''),
      url: String(body.url || ''),
      role: body.role ? String(body.role) : undefined,
      status: body.status === 'online' || body.status === 'offline' ? body.status : 'unknown',
      source: 'manual',
    });
    return NextResponse.json({ ok: true, node });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to save node.' }, { status: 400 });
  }
}
