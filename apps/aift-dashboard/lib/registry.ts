import fs from 'node:fs/promises';
import { parse } from 'yaml';
import { config } from './config';
import type { AiftApp, Registry } from './types';

export async function readRegistry(): Promise<AiftApp[]> {
  try {
    const raw = await fs.readFile(config.registryPath, 'utf8');
    const parsed = parse(raw) as Registry | null;
    const apps = parsed?.apps || {};

    return Object.entries(apps).map(([name, app]) => ({
      name,
      repo: app.repo,
      branch: app.branch || 'main',
      domain: app.domain,
      framework: app.framework || 'unknown',
      status: app.status || 'unknown',
      port: app.port,
      last_successful_release: app.last_successful_release
    }));
  } catch {
    return [];
  }
}

export async function getApp(name: string) {
  const apps = await readRegistry();
  return apps.find((app) => app.name === name) || null;
}
