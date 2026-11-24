// Pure request-authorization policy for the dashboard API.
// Kept free of Next.js imports so tests can load it directly with Node's type stripping.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'aift_dashboard_session';
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
const SESSION_CONTEXT = 'aift-dashboard-session-v1';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Mutating routes that skip the dashboard-token gate. Keep this list short:
// every entry must authenticate on its own or be harmless.
export const PUBLIC_MUTATING_API_ROUTES: ReadonlyArray<{ method: string; path: string; reason: string }> = [
  { method: 'POST', path: '/api/nodes/heartbeat', reason: 'Node agents authenticate with AIFT_NODE_TOKEN inside the handler.' },
  { method: 'POST', path: '/api/session', reason: 'Sign-in: the handler verifies the dashboard token before setting a session cookie.' },
  { method: 'DELETE', path: '/api/session', reason: 'Sign-out only clears the session cookie.' },
];

export type ApiAuthInput = {
  method: string;
  pathname: string;
  authorization?: string | null;
  sessionCookie?: string | null;
  origin?: string | null;
  host?: string | null;
  forwardedHost?: string | null;
};

export type ApiAuthDecision =
  | { ok: true; via: 'safe-method' | 'public-route' | 'bearer' | 'session' }
  | { ok: false; status: 401 | 403 | 503; error: string };

/** Constant-time string comparison. Hashing first equalizes lengths so timingSafeEqual never throws. */
export function safeEqual(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided, 'utf8').digest();
  const b = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(a, b);
}

/** Cookie value derived from the dashboard token, so the raw token never sits in the browser. Rotating the token signs everyone out. */
export function sessionValueForToken(token: string): string {
  return createHmac('sha256', token).update(SESSION_CONTEXT).digest('hex');
}

export function isMutatingMethod(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

export function isPublicMutatingRoute(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  const p = normalizePath(pathname);
  return PUBLIC_MUTATING_API_ROUTES.some((route) => route.method === m && route.path === p);
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

function isSameOrigin(input: ApiAuthInput): boolean {
  // Browsers send Origin on cross-site POSTs; its absence means a same-origin
  // navigation from an older browser or a non-browser client. The session cookie
  // is SameSite=Strict, so cross-site requests do not carry it anyway.
  if (!input.origin) return true;
  const originHost = hostOf(input.origin);
  if (!originHost) return false;
  const candidates = [input.host, input.forwardedHost]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(',').map((part) => part.trim().toLowerCase()));
  return candidates.includes(originHost);
}

/** Checks the bearer token or session cookie against the configured dashboard token. */
export function checkDashboardCredentials(input: ApiAuthInput, dashboardToken: string): ApiAuthDecision {
  if (!dashboardToken) {
    return { ok: false, status: 503, error: 'AIFT_DASHBOARD_TOKEN is not configured, so dashboard actions are disabled. Set it on the server and restart the dashboard.' };
  }

  const header = (input.authorization || '').trim();
  const bearer = /^Bearer\s+(.+)$/i.exec(header);
  if (bearer) {
    return safeEqual(bearer[1].trim(), dashboardToken)
      ? { ok: true, via: 'bearer' }
      : { ok: false, status: 401, error: 'Unauthorized.' };
  }

  if (input.sessionCookie) {
    if (!safeEqual(input.sessionCookie, sessionValueForToken(dashboardToken))) {
      return { ok: false, status: 401, error: 'Your dashboard session is no longer valid. Sign in again at /login.' };
    }
    if (!isSameOrigin(input)) {
      return { ok: false, status: 403, error: 'Cross-origin dashboard request rejected.' };
    }
    return { ok: true, via: 'session' };
  }

  return { ok: false, status: 401, error: 'Sign in at /login, or send Authorization: Bearer <AIFT_DASHBOARD_TOKEN>.' };
}

/** Policy applied by proxy.ts to every /api request. Safe methods pass; mutating methods need credentials unless allowlisted. */
export function authorizeApiRequest(input: ApiAuthInput, dashboardToken: string): ApiAuthDecision {
  if (!isMutatingMethod(input.method)) return { ok: true, via: 'safe-method' };
  if (isPublicMutatingRoute(input.method, input.pathname)) return { ok: true, via: 'public-route' };
  return checkDashboardCredentials(input, dashboardToken);
}
