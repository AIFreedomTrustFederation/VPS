import fs from 'node:fs/promises';
import { parse } from 'yaml';

const registryPath = process.env.AIFT_TEMPLATES_PATH || '/opt/aift/registry/templates.yml';

export type AiftTemplate = {
  id: string;
  name: string;
  framework: string;
  path: string;
  description: string;
};

export async function readTemplates(): Promise<AiftTemplate[]> {
  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    const data = parse(raw) as { templates?: Record<string, any> } | null;
    return Object.entries(data?.templates || {}).map(([id, item]) => ({
      id,
      name: item.name || id,
      framework: item.framework || 'unknown',
      path: item.path || '',
      description: item.description || ''
    }));
  } catch {
    return [];
  }
}

export function getTemplateRegistryPath() {
  return registryPath;
}
