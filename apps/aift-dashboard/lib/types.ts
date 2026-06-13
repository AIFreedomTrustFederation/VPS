export type AppStatus = 'running' | 'stopped' | 'unknown' | 'building' | 'failed';

export type AiftApp = {
  name: string;
  repo?: string;
  branch?: string;
  domain?: string;
  framework?: string;
  status: AppStatus;
  port?: number;
  last_successful_release?: string;
};

export type Registry = {
  apps: Record<string, Partial<AiftApp>>;
};

export type DashboardStatus = {
  ok: boolean;
  timestamp: string;
  registryPath: string;
  logPath: string;
  coolifyConfigured: boolean;
};
