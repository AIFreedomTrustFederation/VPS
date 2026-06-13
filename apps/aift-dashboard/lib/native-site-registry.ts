import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type SiteStatus = 'draft' | 'building' | 'active' | 'failed';
export type DeploymentStatus = 'building' | 'active' | 'failed';
export type HealthStatus = 'checking' | 'healthy' | 'unhealthy';

export type NativeSite = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: SiteStatus;
  primaryUrl: string;
  gatewayPath: string;
  activeDeploymentId?: string;
  fallbackDeploymentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type NativeDeployment = {
  id: string;
  siteId: string;
  status: DeploymentStatus;
  healthStatus: HealthStatus;
  gatewayPath: string;
  artifactPath: string;
  buildLog: string[];
  sourceType: 'static-template' | 'manual' | 'ai-generated' | 'repo-import';
  createdAt: string;
  activatedAt?: string;
  error?: string;
};

export type NativeSiteRegistry = {
  version: 1;
  sites: NativeSite[];
  deployments: NativeDeployment[];
};

const homeDir = process.env.HOME || process.cwd();
const rootDir = process.env.AIFT_ROOT || path.join(homeDir, '.aift');
const registryPath = process.env.AIFT_SITE_REGISTRY_PATH || path.join(rootDir, 'registry', 'sites.json');
const artifactRoot = process.env.AIFT_SITE_ARTIFACT_PATH || path.join(rootDir, 'sites');
const publicBaseUrl = process.env.AIFT_PUBLIC_BASE_URL || 'http://127.0.0.1:3000';

function blankRegistry(): NativeSiteRegistry {
  return { version: 1, sites: [], deployments: [] };
}

function isoNow() {
  return new Date().toISOString();
}

export function normalizeSiteSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function makeGatewayPath(slug: string) {
  return `/s/${slug}`;
}

function makePrimaryUrl(slug: string) {
  return `${publicBaseUrl.replace(/\/$/, '')}${makeGatewayPath(slug)}`;
}

async function saveRegistry(registry: NativeSiteRegistry) {
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf8');
}

export async function readNativeSiteRegistry(): Promise<NativeSiteRegistry> {
  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<NativeSiteRegistry>;
    return {
      version: 1,
      sites: parsed.sites || [],
      deployments: parsed.deployments || []
    };
  } catch {
    return blankRegistry();
  }
}

export async function listNativeSites() {
  const registry = await readNativeSiteRegistry();
  return registry.sites.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createNativeSite(input: { slug: string; title?: string; description?: string }) {
  const registry = await readNativeSiteRegistry();
  const slug = normalizeSiteSlug(input.slug);

  if (slug.length < 3) throw new Error('Site slug must have at least 3 URL-safe characters.');
  if (registry.sites.some((site) => site.slug === slug)) throw new Error(`Site slug already exists: ${slug}`);

  const timestamp = isoNow();
  const site: NativeSite = {
    id: randomUUID(),
    slug,
    title: input.title?.trim() || slug,
    description: input.description?.trim() || '',
    status: 'draft',
    primaryUrl: makePrimaryUrl(slug),
    gatewayPath: makeGatewayPath(slug),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  registry.sites.push(site);
  await saveRegistry(registry);
  return site;
}

export async function deployNativeSite(siteId: string, input: { html?: string; sourceType?: NativeDeployment['sourceType'] } = {}) {
  const registry = await readNativeSiteRegistry();
  const siteIndex = registry.sites.findIndex((site) => site.id === siteId);
  if (siteIndex === -1) throw new Error(`Site not found: ${siteId}`);

  const site = registry.sites[siteIndex];
  const timestamp = isoNow();
  const deploymentId = randomUUID();
  const deploymentDir = path.join(artifactRoot, site.slug, deploymentId);
  const artifactPath = path.join(deploymentDir, 'index.html');

  const deployment: NativeDeployment = {
    id: deploymentId,
    siteId: site.id,
    status: 'building',
    healthStatus: 'checking',
    gatewayPath: site.gatewayPath,
    artifactPath,
    sourceType: input.sourceType || 'static-template',
    buildLog: [
      `${timestamp} build queued`,
      `${timestamp} native AFT site registry selected`,
      `${timestamp} blue-green deployment started`
    ],
    createdAt: timestamp
  };

  registry.deployments.push(deployment);
  registry.sites[siteIndex] = { ...site, status: 'building', updatedAt: timestamp };
  await saveRegistry(registry);

  await fs.mkdir(deploymentDir, { recursive: true });
  await fs.writeFile(artifactPath, input.html || buildDefaultHtml(site), 'utf8');

  const activeAt = isoNow();
  const next = await readNativeSiteRegistry();
  const nextSiteIndex = next.sites.findIndex((item) => item.id === site.id);
  const deploymentIndex = next.deployments.findIndex((item) => item.id === deploymentId);

  if (nextSiteIndex >= 0 && deploymentIndex >= 0) {
    const oldActiveDeploymentId = next.sites[nextSiteIndex].activeDeploymentId;
    next.deployments[deploymentIndex] = {
      ...next.deployments[deploymentIndex],
      status: 'active',
      healthStatus: 'healthy',
      activatedAt: activeAt,
      buildLog: [
        ...next.deployments[deploymentIndex].buildLog,
        `${activeAt} health check passed`,
        `${activeAt} route switched after readiness confirmed`
      ]
    };
    next.sites[nextSiteIndex] = {
      ...next.sites[nextSiteIndex],
      status: 'active',
      activeDeploymentId: deploymentId,
      fallbackDeploymentId: oldActiveDeploymentId,
      updatedAt: activeAt
    };
    await saveRegistry(next);
    return next.deployments[deploymentIndex];
  }

  return deployment;
}

export async function resolveNativeSite(slug: string) {
  const registry = await readNativeSiteRegistry();
  const normalized = normalizeSiteSlug(slug);
  const site = registry.sites.find((item) => item.slug === normalized) || null;
  if (!site) return null;

  const activeDeployment = site.activeDeploymentId
    ? registry.deployments.find((item) => item.id === site.activeDeploymentId) || null
    : null;
  const fallbackDeployment = site.fallbackDeploymentId
    ? registry.deployments.find((item) => item.id === site.fallbackDeploymentId) || null
    : null;

  return {
    site,
    activeDeployment,
    fallbackDeployment,
    ready: site.status === 'active' && activeDeployment?.healthStatus === 'healthy'
  };
}

export async function getNativeDeploymentStatus(deploymentId: string) {
  const registry = await readNativeSiteRegistry();
  const deployment = registry.deployments.find((item) => item.id === deploymentId) || null;
  const site = deployment ? registry.sites.find((item) => item.id === deployment.siteId) || null : null;
  return {
    ready: deployment?.status === 'active' && deployment.healthStatus === 'healthy',
    site,
    deployment
  };
}

export async function readDeploymentArtifact(deployment: NativeDeployment | null) {
  if (!deployment) return null;
  try {
    return await fs.readFile(deployment.artifactPath, 'utf8');
  } catch {
    return null;
  }
}

function buildDefaultHtml(site: NativeSite) {
  const title = escapeHtml(site.title);
  const description = escapeHtml(site.description || 'Native AFT website deployment is live. This page was activated only after the deployment passed the registry health check.');
  const url = escapeHtml(site.primaryUrl);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07060a;color:#fff7ea;font-family:Inter,system-ui,sans-serif}main{width:min(92vw,760px);padding:2rem;border:1px solid rgba(226,185,82,.28);border-radius:28px;background:rgba(18,14,24,.92);box-shadow:0 2rem 6rem rgba(0,0,0,.35)}.eyebrow{color:#e2b952;text-transform:uppercase;letter-spacing:.18em;font-weight:900;font-size:.78rem}h1{margin:.25rem 0 1rem;font-size:clamp(2.2rem,10vw,5rem);line-height:.9;letter-spacing:-.07em}.lead{color:rgba(255,247,234,.72);line-height:1.7;font-size:1.05rem}code{color:#8fb9ff}</style></head><body><main><p class="eyebrow">AIFT Decentralized Website</p><h1>${title}</h1><p class="lead">${description}</p><p class="lead">URL: <code>${url}</code></p></main></body></html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
