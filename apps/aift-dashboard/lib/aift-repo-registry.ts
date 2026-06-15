import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type AiftRepoSourceType = 'local-path' | 'archive' | 'mirror' | 'package';
export type AiftRepoStatus = 'draft' | 'active' | 'disabled' | 'failed';

export type AiftRepoRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sourceType: AiftRepoSourceType;
  localPath?: string;
  archivePath?: string;
  defaultBranch: string;
  status: AiftRepoStatus;
  ownerNodeId?: string;
  createdAt: string;
  updatedAt: string;
};

export type AiftRepoRegistry = {
  version: 1;
  repos: AiftRepoRecord[];
  updatedAt: string;
};

const homeDir = process.env.HOME || process.cwd();
const rootDir = process.env.AIFT_HOME || path.join(homeDir, '.aift-webai');
const registryPath = process.env.AIFT_REPO_REGISTRY_PATH || path.join(rootDir, 'runtime', 'aift-repos.json');

function blank(): AiftRepoRegistry {
  return { version: 1, repos: [], updatedAt: new Date().toISOString() };
}

export function normalizeRepoSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function saveRegistry(registry: AiftRepoRegistry) {
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify({ ...registry, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
}

export async function readAiftRepoRegistry(): Promise<AiftRepoRegistry> {
  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AiftRepoRegistry>;
    return {
      version: 1,
      repos: Array.isArray(parsed.repos) ? parsed.repos : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return blank();
  }
}

export async function listAiftRepos() {
  const registry = await readAiftRepoRegistry();
  return registry.repos.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAiftRepo(idOrSlug: string) {
  const registry = await readAiftRepoRegistry();
  return registry.repos.find((repo) => repo.id === idOrSlug || repo.slug === idOrSlug) || null;
}

export async function upsertAiftRepo(input: Partial<AiftRepoRecord> & { name: string }) {
  const registry = await readAiftRepoRegistry();
  const now = new Date().toISOString();
  const slug = normalizeRepoSlug(input.slug || input.name);
  if (slug.length < 2) throw new Error('Repo slug must have at least 2 URL-safe characters.');

  const existingIndex = input.id
    ? registry.repos.findIndex((repo) => repo.id === input.id)
    : registry.repos.findIndex((repo) => repo.slug === slug);

  const existing = existingIndex >= 0 ? registry.repos[existingIndex] : null;
  const record: AiftRepoRecord = {
    id: existing?.id || input.id || randomUUID(),
    slug,
    name: input.name.trim(),
    description: input.description?.trim() || existing?.description || '',
    sourceType: input.sourceType || existing?.sourceType || 'local-path',
    localPath: input.localPath?.trim() || existing?.localPath,
    archivePath: input.archivePath?.trim() || existing?.archivePath,
    defaultBranch: input.defaultBranch?.trim() || existing?.defaultBranch || 'main',
    status: input.status || existing?.status || 'draft',
    ownerNodeId: input.ownerNodeId?.trim() || existing?.ownerNodeId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) registry.repos[existingIndex] = record;
  else registry.repos.push(record);
  await saveRegistry(registry);
  return record;
}
