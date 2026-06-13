import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

function findRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(current, 'apps'))) return current;
    current = path.dirname(current);
  }
  return process.cwd();
}

export async function GET() {
  const repoRoot = findRepoRoot();
  const filePath = path.join(repoRoot, 'apps/aift-dashboard/data/app-sources.json');

  if (!existsSync(filePath)) {
    return NextResponse.json({ ok: false, sources: [] }, { status: 404 });
  }

  const data = JSON.parse(readFileSync(filePath, 'utf8'));

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    ...data,
  });
}
