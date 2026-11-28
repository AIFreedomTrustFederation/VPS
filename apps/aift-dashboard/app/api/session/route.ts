import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { safeEqual, sessionValueForToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/api-auth-policy';

function isHttps(request: NextRequest) {
  const forwarded = (request.headers.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  return forwarded === 'https' || request.nextUrl.protocol === 'https:';
}

// Sign in: exchange the dashboard token for an HttpOnly, SameSite=Strict session cookie.
export async function POST(request: NextRequest) {
  if (!config.dashboardToken) {
    return NextResponse.json({ ok: false, error: 'AIFT_DASHBOARD_TOKEN is not configured on this node.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token.trim() : '';

  if (!token || !safeEqual(token, config.dashboardToken)) {
    return NextResponse.json({ ok: false, error: 'That token is not correct.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: sessionValueForToken(config.dashboardToken),
    httpOnly: true,
    sameSite: 'strict',
    secure: isHttps(request),
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

// Sign out.
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: SESSION_COOKIE, value: '', httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
