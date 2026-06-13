import { NextRequest } from 'next/server';
import { config } from './config';

export function requireApiAuth(request: NextRequest) {
  if (!config.dashboardToken) {
    return { ok: false, error: 'AIFT_DASHBOARD_TOKEN is not configured.' };
  }

  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();

  if (token !== config.dashboardToken) {
    return { ok: false, error: 'Unauthorized.' };
  }

  return { ok: true };
}
