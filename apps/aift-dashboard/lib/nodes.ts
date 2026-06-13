import fs from 'node:fs/promises';
import { parse } from 'yaml';

const nodeRegistryPath = process.env.AIFT_NODES_PATH || '/opt/aift/registry/nodes.yml';

export type AiftNode = {
  name: string;
  operator?: string;
  operator_class?: 'managed' | 'verified-community' | 'self-hosted' | string;
  region?: string;
  status?: 'online' | 'offline' | 'pending' | 'unknown' | string;
  trust_level?: string;
  cpu_cores?: number;
  memory_gb?: number;
  storage_gb?: number;
  supports?: string[];
  disclosure?: Record<string, boolean>;
};

type NodeRegistry = {
  nodes?: Record<string, Omit<AiftNode, 'name'>>;
};

export async function readNodes(): Promise<AiftNode[]> {
  try {
    const raw = await fs.readFile(nodeRegistryPath, 'utf8');
    const parsed = parse(raw) as NodeRegistry | null;
    const nodes = parsed?.nodes || {};

    return Object.entries(nodes).map(([name, node]) => ({
      name,
      operator: node.operator,
      operator_class: node.operator_class || 'unknown',
      region: node.region || 'unknown',
      status: node.status || 'unknown',
      trust_level: node.trust_level || 'unknown',
      cpu_cores: node.cpu_cores,
      memory_gb: node.memory_gb,
      storage_gb: node.storage_gb,
      supports: node.supports || [],
      disclosure: node.disclosure || {}
    }));
  } catch {
    return [];
  }
}

export function getNodeRegistryPath() {
  return nodeRegistryPath;
}
