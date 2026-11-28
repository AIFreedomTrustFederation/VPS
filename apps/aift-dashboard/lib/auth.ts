import { NextRequest } from 'next/server';
import { config } from './config';
import { checkDashboardCredentials, SESSION_COOKIE, type ApiAuthInput } from './api-auth-policy';

export function apiAuthInput(request: NextRequest): ApiAuthInput {
  return {
    method: request.method,
    pathname: request.nextUrl.pathname,
    authorization: request.headers.get('authorization'),
    sessionCookie: request.cookies.get(SESSION_COOKIE)?.value ?? null,
    origin: request.headers.get('origin'),
    host: request.headers.get('host'),
    forwardedHost: request.headers.get('x-forwarded-host'),
  };
}

/** Route-level check (defense in depth behind proxy.ts). Accepts the bearer token or a signed-in session cookie. */
export function requireApiAuth(request: NextRequest): { ok: true } | { ok: false; error: string; status: number } {
  if (!config.dashboardToken) {
    return { ok: false, error: 'AIFT_DASHBOARD_TOKEN is not configured.', status: 503 };
  }

  const decision = checkDashboardCredentials(apiAuthInput(request), config.dashboardToken);
  if (!decision.ok) {
    return { ok: false, error: decision.error, status: decision.status };
  }

  return { ok: true };
}
