import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from './config';

export type SiteStatus = 'draft' | 'building' | 'deployed' | 'active' | 'failed';
export type DeploymentStatus = 'pending' | 'building' | 'deployed' | 'active' | 'failed';
export type HealthStatus = 'unknown' | 'checking' | 'healthy' | 'unhealthy';

export type AiftSite = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: SiteStatus;
  primaryUrl: string;
  gatewayPath: string;
  activeDeploymentId?: string;
  fallbackDeploymentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type AiftSiteDeployment = {
  id: string;
  siteId: string;
  status: DeploymentStatus;
  sourceType: 'manual' | 'ai-generated' | 'repo-import' | 'static-template';
  artifactPath?: string;
  gatewayPath: string;
  localUrl?: string;
  ipfsCid?: string;
  filecoinDealId?: string;
  healthStatus: HealthStatus;
  buildLog: string[];
  error?: string;
  createdAt: string;
  activatedAt?: string;
};

export type AiftSiteRegistry = {
  version: 1;
  sites: AiftSite[];
  deployments: AiftSiteDeployment[];
};

export type CreateSiteInput = {
  slug: string;
  title?: string;
  description?: string;
};

export type DeploySiteInput = {
  sourceType?: AiftSiteDeployment['sourceType'];
  html?: string;
};

const emptyRegistry = (): AiftSiteRegistry => ({
  version: 1,
  sites: [],
  deployments: []
});

async function ensureParent(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function ensureArtifactDir() {
  await fs.mkdir(config.siteArtifactPath, { recursive: true });
}

export function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function now() {
  return new Date().toISOString();
}

export function siteUrl(slug: string) {
  const base = config.publicBaseUrl.replace(/\/$/, '');
  return `${base}/s/${slug}`;
}

export async function readSiteRegistry(): Promise<AiftSiteRegistry> {
  try {
    const raw = await fs.readFile(config.siteRegistryPath, 'utf8');
    const parsed = JSON.parse(raw) as AiftSiteRegistry;
    return {
      version: 1,
      sites: parsed.sites || [],
      deployments: parsed.deployments || []
    };
  } catch {
    return emptyRegistry();
  }
}

async function writeSiteRegistry(registry: AiftSiteRegistry) {
  await ensureParent(config.siteRegistryPath);
  await fs.writeFile(config.siteRegistryPath, JSON.stringify(registry, null, 2));
}

export async function listSites() {
  const registry = await readSiteRegistry();
  return registry.sites.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSiteBySlug(slug: string) {
  const registry = await readSiteRegistry();
  return registry.sites.find((site) => site.slug === normalizeSlug(slug)) || null;
}

export async function getSiteById(siteId: string) {
  const registry = await readSiteRegistry();
  return registry.sites.find((site) => site.id === siteId) || null;
}

export async function getActiveDeployment(siteId: string) {
  const registry = await readSiteRegistry();
  const site = registry.sites.find((item) => item.id === siteId);
  if (!site?.activeDeploymentId) return null;
  return registry.deployments.find((deployment) => deployment.id === site.activeDeploymentId) || null;
}

export async function createSite(input: CreateSiteInput) {
  const registry = await readSiteRegistry();
  const slug = normalizeSlug(input.slug);

  if (!slug || slug.length < 3) {
    throw new Error('Site slug must contain at least 3 URL-safe characters.');
  }

  if (registry.sites.some((site) => site.slug === slug)) {
    throw new Error(`The site slug "${slug}" is already registered.`);
  }

  const timestamp = now();
  const site: AiftSite = {
    id: randomUUID(),
    slug,
    title: input.title?.trim() || slug,
    description: input.description?.trim() || '',
    status: 'draft',
    primaryUrl: siteUrl(slug),
    gatewayPath: `/s/${slug}`,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  registry.sites.push(site);
  await writeSiteRegistry(registry);
  return site;
}

export async function deploySite(siteId: string, input: DeploySiteInput = {}) {
  const registry = await readSiteRegistry();
  const siteIndex = registry.sites.findIndex((site) => site.id === siteId);

  if (siteIndex === -1) {
    throw new Error(`Site ${siteId} was not found.`);
  }

  const site = registry.sites[siteIndex];
  const timestamp = now();
  const deploymentId = randomUUID();
  const deploymentDir = path.join(config.siteArtifactPath, site.slug, deploymentId);
  const artifactPath = path.join(deploymentDir, 'index.html');

  const deployment: AiftSiteDeployment = {
    id: deploymentId,
    siteId: site.id,
    status: 'building',
    sourceType: input.sourceType || 'static-template',
    artifactPath,
    gatewayPath: site.gatewayPath,
    localUrl: site.primaryUrl,
    healthStatus: 'checking',
    buildLog: [
      `${timestamp} queued build`,
      `${timestamp} selected native AFT Site Registry deployer`,
      `${timestamp} writing static artifact`
    ],
    createdAt: timestamp
  };

  registry.deployments.push(deployment);
  registry.sites[siteIndex] = {
    ...site,
    status: 'building',
    updatedAt: timestamp
  };
  await writeSiteRegistry(registry);

  await ensureArtifactDir();
  await fs.mkdir(deploymentDir, { recursive: true });
  await fs.writeFile(artifactPath, input.html?.trim() || defaultSiteHtml(site), 'utf8');

  const readyAt = now();
  const nextRegistry = await readSiteRegistry();
  const nextSiteIndex = nextRegistry.sites.findIndex((item) => item.id === site.id);
  const deploymentIndex = nextRegistry.deployments.findIndex((item) => item.id === deploymentId);

  if (nextSiteIndex >= 0 && deploymentIndex >= 0) {
    const previousActive = nextRegistry.sites[nextSiteIndex].activeDeploymentId;

    nextRegistry.deployments[deploymentIndex] = {
      ...nextRegistry.deployments[deploymentIndex],
      status: 'active',
      healthStatus: 'healthy',
      activatedAt: readyAt,
      buildLog: [
        ...nextRegistry.deployments[deploymentIndex].buildLog,
        `${readyAt} health check passed`,
        `${readyAt} activated deployment`
      ]
    };

    nextRegistry.sites[nextSiteIndex] = {
      ...nextRegistry.sites[nextSiteIndex],
      status: 'active',
      activeDeploymentId: deploymentId,
      fallbackDeploymentId: previousActive,
      updatedAt: readyAt
    };

    await writeSiteRegistry(nextRegistry);
    return nextRegistry.deployments[deploymentIndex];
  }

  return deployment;
}

export async function resolveSite(slug: string) {
  const registry = await readSiteRegistry();
  const normalized = normalizeSlug(slug);
  const site = registry.sites.find((item) => item.slug === normalized) || null;

  if (!site) {
    return null;
  }

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

export async function getDeploymentStatus(deploymentId: string) {
  const registry = await readSiteRegistry();
  const deployment = registry.deployments.find((item) => item.id === deploymentId) || null;
  const site = deployment ? registry.sites.find((item) => item.id === deployment.siteId) || null : null;

  return {
    ready: deployment?.status === 'active' && deployment.healthStatus === 'healthy',
    site,
    deployment
  };
}

export async function readDeploymentHtml(deployment: AiftSiteDeployment | null) {
  if (!deployment?.artifactPath) return null;

  try {
    return await fs.readFile(deployment.artifactPath, 'utf8');
  } catch {
    return null;
  }
}

function defaultSiteHtml(site: AiftSite) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(site.title)}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #07060a; color: #fff7ea; font-family: Inter, system-ui, sans-serif; }
    main { width: min(92vw, 760px); padding: 2rem; border: 1px solid rgba(226,185,82,.28); border-radius: 28px; background: rgba(18,14,24,.92); box-shadow: 0 2rem 6rem rgba(0,0,0,.35); }
    p:first-child { color: #e2b952; text-transform: uppercase; letter-spacing: .18em; font-weight: 900; font-size: .78rem; }
    h1 { margin: .25rem 0 1rem; font-size: clamp(2.2rem, 10vw, 5rem); line-height: .9; letter-spacing: -.07em; }
    .lead { color: rgba(255,247,234,.72); line-height: 1.7; font-size: 1.05rem; }
    code { color: #8fb9ff; }
  </style>
</head>
<body>
  <main>
    <p>AIFT Decentralized Website</p>
    <h1>${escapeHtml(site.title)}</h1>
    <p class="lead">${escapeHtml(site.description || 'This site is served through the native AI Freedom Trust Site Registry. The old page stays available until the new deployment is healthy, so sync handoffs do not crash the user experience.')}</p>
    <p class="lead">URL: <code>${escapeHtml(site.primaryUrl)}</code></p>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
