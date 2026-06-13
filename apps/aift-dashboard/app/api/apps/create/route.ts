import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  let payload: Record<string, string> = {};

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    payload = {
      name: String(body.name || ''),
      repo: String(body.repo || ''),
      domain: String(body.domain || ''),
      template: String(body.template || 'vite-react'),
      trust_class: String(body.trust_class || 'public-static')
    };
  } else {
    const form = await request.formData();
    payload = {
      name: String(form.get('name') || ''),
      repo: String(form.get('repo') || ''),
      domain: String(form.get('domain') || ''),
      template: String(form.get('template') || 'vite-react'),
      trust_class: String(form.get('trust_class') || 'public-static')
    };
  }

  if (!payload.name || !payload.repo) {
    return NextResponse.json({ ok: false, error: 'App name and repo are required.' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    accepted: true,
    message: 'App creation request accepted. Registry writing and GitHub file generation will be enabled in the next layer.',
    app: payload
  });
}
