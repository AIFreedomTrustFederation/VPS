import { NextRequest, NextResponse } from 'next/server';
import { listAiftRepos, upsertAiftRepo } from '@/lib/aift-repo-registry';

export async function GET() {
  const repos = await listAiftRepos();
  return NextResponse.json({ ok: true, repos, count: repos.length, checkedAt: new Date().toISOString() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  try {
    const repo = await upsertAiftRepo({
      id: body.id ? String(body.id) : undefined,
      name: String(body.name || ''),
      slug: body.slug ? String(body.slug) : undefined,
      description: body.description ? String(body.description) : '',
      sourceType: body.sourceType === 'archive' || body.sourceType === 'mirror' || body.sourceType === 'package' ? body.sourceType : 'local-path',
      localPath: body.localPath ? String(body.localPath) : undefined,
      archivePath: body.archivePath ? String(body.archivePath) : undefined,
      defaultBranch: body.defaultBranch ? String(body.defaultBranch) : 'main',
      status: body.status === 'active' || body.status === 'disabled' || body.status === 'failed' ? body.status : 'draft',
      ownerNodeId: body.ownerNodeId ? String(body.ownerNodeId) : undefined,
    });
    return NextResponse.json({ ok: true, repo });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Repo save failed.' }, { status: 400 });
  }
}
