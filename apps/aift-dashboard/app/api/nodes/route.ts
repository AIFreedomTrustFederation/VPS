import { NextResponse } from 'next/server';
import { getNodeRegistryPath, readNodes } from '@/lib/nodes';

export async function GET() {
  const nodes = await readNodes();

  return NextResponse.json({
    ok: true,
    path: getNodeRegistryPath(),
    nodes
  });
}
