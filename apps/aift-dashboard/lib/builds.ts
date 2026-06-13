import fs from 'node:fs/promises';
import { parse } from 'yaml';

const registryPath = process.env.AIFT_BUILDS_PATH || '/opt/aift/registry/builds.yml';

export type AiftBuild = {
  id: string;
  app: string;
  status: string;
  node: string;
  started_at?: string | null;
  finished_at?: string | null;
  commit?: string;
  framework?: string;
};

export async function readBuilds(): Promise<AiftBuild[]> {
  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    const data = parse(raw) as { builds?: Record<string, any> } | null;
    return Object.entries(data?.builds || {}).map(([id, item]) => ({
      id,
      app: item.app || 'unknown',
      status: item.status || 'unknown',
      node: item.node || 'unassigned',
      started_at: item.started_at,
      finished_at: item.finished_at,
      commit: item.commit || '',
      framework: item.framework || 'unknown'
    }));
  } catch {
    return [];
  }
}

export function getBuildRegistryPath() {
  return registryPath;
}
