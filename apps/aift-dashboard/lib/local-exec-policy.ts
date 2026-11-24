// Opt-in switch and child-process environment for dashboard routes that clone,
// install, build or run code, or run node maintenance scripts.
// Kept free of Next.js imports so tests can load it directly.

type Env = Record<string, string | undefined>;

export const LOCAL_EXEC_FLAG = 'AIFT_ENABLE_LOCAL_EXEC_ROUTES';

/**
 * Explicit "1/true/yes/on" enables and "0/false/no/off" disables.
 * When unset, the routes stay on for development nodes (`next dev`, e.g. Termux phones)
 * and off for production builds such as the Docker deployment.
 */
export function localExecRoutesEnabled(env: Env): boolean {
  const raw = (env[LOCAL_EXEC_FLAG] || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return env.NODE_ENV !== 'production';
}

// Only what package managers, git and Termux need to work. Dashboard and node
// tokens, Coolify credentials and other secrets are never passed to child processes.
const CHILD_ENV_KEYS = [
  'PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'TERM',
  'TMPDIR', 'TMP', 'TEMP',
  'PREFIX', 'ANDROID_ROOT', 'ANDROID_DATA', 'LD_PRELOAD',
  'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy',
  'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE', 'SSL_CERT_DIR',
  'npm_config_registry', 'npm_config_cache',
];

export function minimalChildEnv(env: Env, extra: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of CHILD_ENV_KEYS) {
    const value = env[key];
    if (typeof value === 'string' && value !== '') out[key] = value;
  }
  return { ...out, ...extra };
}
