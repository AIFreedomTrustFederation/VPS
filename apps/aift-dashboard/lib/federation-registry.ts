import fs from 'node:fs/promises';
import path from 'node:path';

export type FederationNode = {
  node_id: string;
  name: string;
  url: string;
  role?: string;
  last_seen_at?: string;
  status?: 'unknown' | 'online' | 'offline';
  source?: 'manual' | 'heartbeat' | 'local';
};

export type FederationRegistry = {
  version: 1;
  nodes: FederationNode[];
  updated_at: string;
};

const homeDir = process.env.HOME || process.cwd();
const rootDir = process.env.AIFT_HOME || path.join(homeDir, '.aift-webai');
const registryPath = process.env.AIFT_FEDERATION_REGISTRY || path.join(rootDir, 'runtime', 'federation-nodes.json');

function blank(): FederationRegistry {
  return { version: 1, nodes: [], updated_at: new Date().toISOString() };
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/$/, '');
}

export async function readFederationRegistry(): Promise<FederationRegistry> {
  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FederationRegistry>;
    return {
      version: 1,
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      updated_at: parsed.updated_at || new Date().toISOString(),
    };
  } catch {
    return blank();
  }
}

export async function saveFederationRegistry(registry: FederationRegistry) {
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify({ ...registry, updated_at: new Date().toISOString() }, null, 2), 'utf8');
}

export async function upsertFederationNode(input: FederationNode) {
  if (!input.node_id?.trim()) throw new Error('node_id is required');
  if (!input.url?.trim()) throw new Error('url is required');

  const registry = await readFederationRegistry();
  const node: FederationNode = {
    ...input,
    node_id: input.node_id.trim(),
    name: input.name?.trim() || input.node_id.trim(),
    url: normalizeUrl(input.url),
    status: input.status || 'unknown',
    source: input.source || 'manual',
    last_seen_at: input.last_seen_at || new Date().toISOString(),
  };

  const index = registry.nodes.findIndex((item) => item.node_id === node.node_id);
  if (index >= 0) registry.nodes[index] = { ...registry.nodes[index], ...node };
  else registry.nodes.push(node);
  await saveFederationRegistry(registry);
  return node;
}

export async function localNodeFromRuntime(): Promise<FederationNode | null> {
  try {
    const runtime = path.join(rootDir, 'runtime');
    const identity = JSON.parse(await fs.readFile(path.join(runtime, 'node-identity.json'), 'utf8'));
    const phone = JSON.parse(await fs.readFile(path.join(runtime, 'phone-url.json'), 'utf8'));
    return {
      node_id: identity.node_id,
      name: identity.device_name || identity.node_id,
      url: phone.phone_url || identity.last_known_url,
      role: identity.role || 'mobile-provider-node',
      last_seen_at: identity.last_seen_at || phone.updated_at,
      status: 'online',
      source: 'local',
    };
  } catch {
    return null;
  }
}

export async function listFederationNodes() {
  const registry = await readFederationRegistry();
  const local = await localNodeFromRuntime();
  if (local && !registry.nodes.some((node) => node.node_id === local.node_id)) {
    return [local, ...registry.nodes];
  }
  if (local) {
    return registry.nodes.map((node) => node.node_id === local.node_id ? { ...node, ...local } : node);
  }
  return registry.nodes;
}
