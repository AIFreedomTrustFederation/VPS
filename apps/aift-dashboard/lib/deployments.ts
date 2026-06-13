import fs from 'node:fs/promises';
import { parse } from 'yaml';

const registryPath = process.env.AIFT_DEPLOYMENTS_PATH || '/opt/aift/registry/deployments.yml';

export type AiftDeployment = {
  id: string;
  app: string;
  node: string;
  domain: string;
  status: string;
  deployed_at?: string | null;
  disclosure_required?: boolean;
  disclosure_path?: string;
};

export async function readDeployments(): Promise<AiftDeployment[]> {
  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    const data = parse(raw) as { deployments?: Record<string, any> } | null;
    return Object.entries(data?.deployments || {}).map(([id, item]) => ({
      id,
      app: item.app || 'unknown',
      node: item.node || 'unassigned',
      domain: item.domain || '',
      status: item.status || 'unknown',
      deployed_at: item.deployed_at,
      disclosure_required: Boolean(item.disclosure_required),
      disclosure_path: item.disclosure_path || `/disclosures/${encodeURIComponent(item.app || id)}`
    }));
  } catch {
    return [];
  }
}

export async function getDeploymentByApp(app: string) {
  const deployments = await readDeployments();
  return deployments.find((deployment) => deployment.app === app) || null;
}

export function getDeploymentRegistryPath() {
  return registryPath;
}
