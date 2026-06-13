import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { triggerRebuild } from '@/lib/coolify';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  let app = '';

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    app = String(body.app || '');
    const auth = requireApiAuth(request);
    if (!auth.ok) return NextResponse.json(auth, { status: 401 });
  } else {
    const form = await request.formData();
    app = String(form.get('app') || '');
  }

  if (!app) {
    return NextResponse.json({ ok: false, error: 'Missing app name.' }, { status: 400 });
  }

  const result = await triggerRebuild(app);
  return NextResponse.json(result, { status: result.ok ? 200 : 501 });
}
