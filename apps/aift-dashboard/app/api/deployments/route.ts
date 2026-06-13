import { NextResponse } from 'next/server';
import { getDeploymentRegistryPath, readDeployments } from '@/lib/deployments';

export async function GET() {
  const deployments = await readDeployments();
  return NextResponse.json({ ok: true, path: getDeploymentRegistryPath(), deployments });
}
