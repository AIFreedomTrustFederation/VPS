import fs from 'node:fs/promises';

export type HealthCheck = {
  name: string;
  status: 'healthy' | 'warning' | 'broken';
  message: string;
};

async function fileExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function getHealthChecks(): Promise<HealthCheck[]> {
  const paths = [
    ['Apps registry', process.env.AIFT_REGISTRY_PATH || '/opt/aift/registry/apps.yml'],
    ['Nodes registry', process.env.AIFT_NODES_PATH || '/opt/aift/registry/nodes.yml'],
    ['Templates registry', process.env.AIFT_TEMPLATES_PATH || '/opt/aift/registry/templates.yml'],
    ['Builds registry', process.env.AIFT_BUILDS_PATH || '/opt/aift/registry/builds.yml'],
    ['Deployments registry', process.env.AIFT_DEPLOYMENTS_PATH || '/opt/aift/registry/deployments.yml']
  ];

  const checks: HealthCheck[] = [];

  for (const [name, path] of paths) {
    const exists = await fileExists(path);
    checks.push({
      name,
      status: exists ? 'healthy' : 'warning',
      message: exists ? `${path} exists.` : `${path} is missing.`
    });
  }

  checks.push({
    name: 'Dashboard token',
    status: process.env.AIFT_DASHBOARD_TOKEN ? 'healthy' : 'warning',
    message: process.env.AIFT_DASHBOARD_TOKEN ? 'Dashboard token is configured.' : 'AIFT_DASHBOARD_TOKEN is not configured.'
  });

  checks.push({
    name: 'Node token',
    status: process.env.AIFT_NODE_TOKEN ? 'healthy' : 'warning',
    message: process.env.AIFT_NODE_TOKEN ? 'Node heartbeat token is configured.' : 'AIFT_NODE_TOKEN is not configured.'
  });

  checks.push({
    name: 'Coolify',
    status: process.env.COOLIFY_URL && process.env.COOLIFY_API_TOKEN ? 'healthy' : 'warning',
    message: process.env.COOLIFY_URL && process.env.COOLIFY_API_TOKEN ? 'Coolify integration is configured.' : 'Coolify integration is not fully configured yet.'
  });

  return checks;
}

export function summarizeHealth(checks: HealthCheck[]) {
  if (checks.some((check) => check.status === 'broken')) return 'broken';
  if (checks.some((check) => check.status === 'warning')) return 'warning';
  return 'healthy';
}
