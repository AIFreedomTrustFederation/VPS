import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

export type TenantSecretRecord = {
  tenant_id: string;
  tenant_name: string;
  created_at: string;
  secrets: Record<string, string>;
};

export type TenantSecretSummary = {
  tenant_id: string;
  tenant_name: string;
  created_at: string;
  secret_names: string[];
  storage_path: string;
  created: boolean;
};

const DEFAULT_SECRET_ROOT = '/opt/aift/secrets/users';

export function slugifyTenantName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function secretRoot(): string {
  return process.env.AIFT_USER_SECRETS_PATH || DEFAULT_SECRET_ROOT;
}

function secretPath(tenantId: string): string {
  return path.join(secretRoot(), `${tenantId}.json`);
}

function token(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

function createRecord(tenantName: string): TenantSecretRecord {
  const tenantId = slugifyTenantName(tenantName);
  return {
    tenant_id: tenantId,
    tenant_name: tenantName,
    created_at: new Date().toISOString(),
    secrets: {
      tenant_api_token: token(32),
      dashboard_session_secret: token(32),
      node_registration_token: token(32),
      webhook_signing_secret: token(32),
      registry_encryption_key: token(32),
      deploy_action_token: token(32),
    },
  };
}

function summarize(record: TenantSecretRecord, storagePath: string, created: boolean): TenantSecretSummary {
  return {
    tenant_id: record.tenant_id,
    tenant_name: record.tenant_name,
    created_at: record.created_at,
    secret_names: Object.keys(record.secrets),
    storage_path: storagePath,
    created,
  };
}

export function ensureTenantSecrets(tenantName = 'AI Freedom Trust'): TenantSecretSummary {
  const tenantId = slugifyTenantName(tenantName);
  if (!tenantId) {
    throw new Error('Tenant name must contain at least one letter or number.');
  }

  const root = secretRoot();
  const filePath = secretPath(tenantId);
  mkdirSync(root, { recursive: true, mode: 0o700 });

  if (existsSync(filePath)) {
    const existing = JSON.parse(readFileSync(filePath, 'utf8')) as TenantSecretRecord;
    return summarize(existing, filePath, false);
  }

  const record = createRecord(tenantName);
  writeFileSync(filePath, JSON.stringify(record, null, 2), { mode: 0o600 });
  chmodSync(filePath, 0o600);
  return summarize(record, filePath, true);
}
