import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from './auth';
import { LOCAL_EXEC_FLAG, localExecRoutesEnabled, minimalChildEnv } from './local-exec-policy';

/** Returns a response to send when the route must not run, or null when it may proceed. */
export function guardLocalExecRoute(request: NextRequest): NextResponse | null {
  if (!localExecRoutesEnabled(process.env)) {
    return NextResponse.json(
      {
        ok: false,
        error: `This action runs code on the node and is turned off here. Set ${LOCAL_EXEC_FLAG}=1 only on a trusted, single-operator node to enable it.`,
      },
      { status: 403 },
    );
  }

  const auth = requireApiAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  return null;
}

/**
 * Minimal environment for code run from cloned repos (git, npm/pnpm/yarn install, build, preview).
 * NODE_ENV is deliberately not forwarded, so installs keep devDependencies.
 */
export function childProcessEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return minimalChildEnv(process.env, extra) as unknown as NodeJS.ProcessEnv;
}
