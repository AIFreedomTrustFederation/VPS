import { existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';

function aiftHome() {
  return process.env.AIFT_HOME || path.join(homedir(), '.aift-webai');
}

function existsUnderHome(relativePath: string) {
  return existsSync(path.join(aiftHome(), relativePath));
}

export async function GET() {
  const features = [
    {
      id: 'repo-source-intake',
      label: 'GitHub source intake',
      status: 'ready',
      evidence: 'Saved sources are read from the local app source registry.',
    },
    {
      id: 'app-profile-generation',
      label: 'App profile generation',
      status: 'ready',
      evidence: 'Profiles are generated from real GitHub files.',
    },
    {
      id: 'workspace-preparation',
      label: 'Workspace preparation',
      status: existsUnderHome('workspaces') ? 'ready' : 'needs-action',
      evidence: 'Workspace API clones or pulls the real repository into the local node workspace.',
    },
    {
      id: 'dependency-install',
      label: 'Dependency installation',
      status: 'locked',
      evidence: 'Will unlock after workspace preparation logs are verified.',
    },
    {
      id: 'build-execution',
      label: 'Build execution',
      status: 'locked',
      evidence: 'Will unlock after dependency installation is real and logged.',
    },
    {
      id: 'runtime-preview',
      label: 'Runtime preview URL',
      status: 'locked',
      evidence: 'Will unlock only after a real local process starts and registers a service URL.',
    },
    {
      id: 'open-model-runtime',
      label: 'Open model runtime',
      status: 'needs-runtime',
      evidence: 'Runtime status route exists; local model service must be available on the node.',
    },
  ];

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    policy: '/docs/production-readiness-rules.md',
    features,
  });
}
