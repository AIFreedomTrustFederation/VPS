import { NextRequest, NextResponse } from 'next/server';
import { readAppSources } from '@/lib/app-sources';

const commonFiles = [
  'README.md',
  'package.json',
  'app/page.tsx',
  'src/app/page.tsx',
  'pages/index.tsx',
  'components/LeadCapture.tsx',
  'components/QuickRouteCapture.tsx',
  'components/LocalAIConcierge.tsx',
  'app/api/leads/route.ts',
  'lib/ccp-database.ts',
  'lib/zip-zone.ts',
  'scripts/audit-open-source-licenses.mjs',
];

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

export async function GET(_request: NextRequest, context: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await context.params;
  const source = readAppSources().find((item) => item.id === sourceId);

  if (!source) {
    return NextResponse.json({ ok: false, message: 'App source not found.' }, { status: 404 });
  }

  const files = await Promise.all(commonFiles.map(async (file) => {
    try {
      const response = await fetch(rawUrl(source.repo, source.branch, file), { cache: 'no-store' });
      if (!response.ok) return { file, found: false, status: response.status };
      return summarizeFile(file, await response.text());
    } catch (error) {
      return { file, found: false, error: error instanceof Error ? error.message : 'Read failed' };
    }
  }));

  const found = files.filter((file) => file.found);

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    source,
    files,
    profile: {
      source_of_truth: 'github',
      found_files: found.length,
      framework: files.some((file) => file.found && file.file === 'package.json') ? 'detected-from-package-json' : 'unknown',
      app_profile_ready: found.length > 0,
      recommended_next_step: found.length > 0 ? 'Create an AIFT app profile from this source.' : 'Verify the repository URL and branch.',
    },
  });
}
