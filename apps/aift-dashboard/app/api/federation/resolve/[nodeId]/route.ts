import { NextResponse } from 'next/server';
import { listFederationNodes } from '@/lib/federation-registry';

type Props = { params: Promise<{ nodeId: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { nodeId } = await params;
  const nodes = await listFederationNodes();
  const node = nodes.find((item) => item.node_id === nodeId) || null;
  if (!node) return NextResponse.json({ ok: false, error: 'Node not found.' }, { status: 404 });
  return NextResponse.json({ ok: true, node, checked_at: new Date().toISOString() });
}
