import { config } from './config';

export async function coolifyRequest(path: string, init: RequestInit = {}) {
  if (!config.coolifyUrl || !config.coolifyApiToken) {
    throw new Error('Coolify is not configured. Set COOLIFY_URL and COOLIFY_API_TOKEN.');
  }

  const url = new URL(path, config.coolifyUrl);
  const response = await fetch(url, {
    ...init,
    headers: {
      'Authorization': `Bearer ${config.coolifyApiToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Coolify request failed: ${response.status} ${body}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function triggerRebuild(appName: string) {
  // This is intentionally a placeholder until the selected Coolify resource UUIDs
  // are mapped into the /opt/aift registry.
  return {
    ok: false,
    app: appName,
    message: 'Rebuild API is reserved. Map appName to Coolify resource UUID before enabling.'
  };
}
