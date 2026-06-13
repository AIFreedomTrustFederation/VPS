import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const filesToRead = [
  'README.md',
  'package.json',
  'app/page.tsx',
  'components/LeadCapture.tsx',
  'components/QuickRouteCapture.tsx',
  'components/LocalAIConcierge.tsx',
  'app/api/leads/route.ts',
  'lib/ccp-database.ts',
  'lib/zip-zone.ts',
  'scripts/audit-open-source-licenses.mjs',
];

function findRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(current, 'apps'))) return current;
    current = path.dirname(current);
  }
  return process.cwd();
}

function readSources() {
  const repoRoot = findRepoRoot();
  const filePath = path.join(repoRoot, 'apps/aift-dashboard/data/app-sources.json');
  if (!existsSync(filePath)) return [];
  return JSON.parse(readFileSync(filePath, 'utf8')).sources ?? [];
}

function rawUrl(repo: string, branch: string, file: string) {
  return `https://raw.githubusercontent.com/${repo}/${branch}/${file}`;
}

function summarizeFile(file: string, content: string) {
  return {
    file,
    found: true,
    bytes: content.length,
    lines: content.split('\n').length,
    has_next_app: content.includes('next') || content.includes('NextResponse'),
    has_form: content.includes('<form') || content.includes('FormEvent'),
    has_storage: content.includes('localStorage') || content.includes('sessionStorage'),
    has_api_route: file.includes('api/') || content.includes('NextResponse'),
    has_license_logic: content.includes('license') || content.includes('blockedPattern'),
  };
}

export async function GET() {
  const source = readSources().find((item: { id: string }) => item.id === 'capital-city-provisions');
  if (!source) {
    return NextResponse.json({ ok: false, message: 'Source not found.' }, { status: 404 });
  }

  const fileResults = await Promise.all(filesToRead.map(async (file) => {
    try {
      const response = await fetch(rawUrl(source.repo, source.branch, file), { cache: 'no-store' });
      if (!response.ok) return { file, found: false, status: response.status };
      return summarizeFile(file, await response.text());
    } catch (error) {
      return { file, found: false, error: error instanceof Error ? error.message : 'Read failed' };
    }
  }));

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    source,
    files: fileResults,
    profile: {
      framework: 'nextjs',
      source_of_truth: 'github',
      build_candidate: true,
      template_family: 'decentralized-service-app',
      recommended_next_step: 'Create the first AIFT app profile from this connected source.',
    },
  });
}
