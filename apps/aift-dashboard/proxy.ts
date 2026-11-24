import { NextRequest, NextResponse } from 'next/server';
import { authorizeApiRequest, SESSION_COOKIE } from './lib/api-auth-policy';

// Every mutating /api request needs the dashboard token (Authorization: Bearer)
// or the session cookie set by /login. See PUBLIC_MUTATING_API_ROUTES for the
// few routes that authenticate themselves.
export function proxy(request: NextRequest) {
  const decision = authorizeApiRequest(
    {
      method: request.method,
      pathname: request.nextUrl.pathname,
      authorization: request.headers.get('authorization'),
      sessionCookie: request.cookies.get(SESSION_COOKIE)?.value ?? null,
      origin: request.headers.get('origin'),
      host: request.headers.get('host'),
      forwardedHost: request.headers.get('x-forwarded-host'),
    },
    process.env.AIFT_DASHBOARD_TOKEN || '',
  );

  if (decision.ok) return NextResponse.next();
  return NextResponse.json({ ok: false, error: decision.error }, { status: decision.status });
}

export const config = {
  matcher: ['/api/:path*'],
};
