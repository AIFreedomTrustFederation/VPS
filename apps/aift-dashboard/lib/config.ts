export const config = {
  dashboardToken: process.env.AIFT_DASHBOARD_TOKEN || '',
  registryPath: process.env.AIFT_REGISTRY_PATH || '/opt/aift/registry/apps.yml',
  logPath: process.env.AIFT_LOG_PATH || '/opt/aift/logs',
  coolifyUrl: process.env.COOLIFY_URL || '',
  coolifyApiToken: process.env.COOLIFY_API_TOKEN || ''
};

export function isCoolifyConfigured() {
  return Boolean(config.coolifyUrl && config.coolifyApiToken);
}
