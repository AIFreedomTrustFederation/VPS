import { NextRequest, NextResponse } from 'next/server';
import { requireBearerToken } from '@/lib/auth';
import { ensureTenantSecrets } from '@/lib/tenant-secrets';

export async function POST(request: NextRequest) {
  const auth = requireBearerToken(request.headers);
  if (auth) return auth;

  const body = await request.json().catch(() => ({}));
  const tenantName = typeof body.tenant_name === 'string' && body.tenant_name.trim()
    ? body.tenant_name.trim()
    : 'AI Freedom Trust';

  try {
    const summary = ensureTenantSecrets(tenantName);
    return NextResponse.json({ ok: true, tenant: summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to bootstrap tenant secrets.' },
      { status: 500 },
    );
  }
}
