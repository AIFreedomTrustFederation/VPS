import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type DomainStatus = 'reserved' | 'active' | 'suspended' | 'expired' | 'pending_verification';
export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'SRV' | 'CAA' | 'ALIAS' | 'AFT-LINK' | 'AFT-NODE' | 'AFT-MIRROR' | 'AFT-CID' | 'AFT-APP';

export type DomainRecord = {
  id: string;
  domainName: string;
  label: string;
  zone: string;
  status: DomainStatus;
  ownerId: string;
  connectedSiteId?: string;
  locked: boolean;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DnsRecord = {
  id: string;
  domainName: string;
  type: DnsRecordType;
  name: string;
  value: string;
  ttl: number;
  priority?: number;
  createdAt: string;
  updatedAt: string;
};

export type DomainAuditEvent = {
  id: string;
  domainName: string;
  action: string;
  message: string;
  createdAt: string;
};

export type DomainRegistry = {
  version: 1;
  domains: DomainRecord[];
  records: DnsRecord[];
  audit: DomainAuditEvent[];
};

const allowedRecordTypes: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA', 'ALIAS', 'AFT-LINK', 'AFT-NODE', 'AFT-MIRROR', 'AFT-CID', 'AFT-APP'];
const homeDir = process.env.HOME || process.cwd();
const rootDir = process.env.AIFT_ROOT || path.join(homeDir, '.aift');
const registryPath = process.env.AIFT_DOMAIN_REGISTRY_PATH || path.join(rootDir, 'registry', 'domains.json');

function emptyRegistry(): DomainRegistry {
  return { version: 1, domains: [], records: [], audit: [] };
}

function isoNow() {
  return new Date().toISOString();
}

export function normalizeDomainName(input: string) {
  let value = input.toLowerCase().trim();
  value = value.replace('http://', '').replace('https://', '');
  if (value.endsWith('/')) value = value.slice(0, -1);
  return value.endsWith('.aft') ? value : value + '.aft';
}

export function validateAftDomainName(input: string) {
  const domainName = normalizeDomainName(input);
  const parts = domainName.split('.');
  const label = parts[0] || '';

  if (parts.length !== 2 || parts[1] !== 'aft') throw new Error('Only internal .aft names are supported.');
  if (label.length < 3 || label.length > 63) throw new Error('Domain label must be 3-63 characters.');
  if (label.startsWith('-') || label.endsWith('-')) throw new Error('Domain label cannot start or end with a hyphen.');
  if (!label.split('').every((char) => (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char === '-')) throw new Error('Domain label may contain only lowercase letters, numbers, and hyphens.');

  return { domainName, label, zone: 'aft' };
}

function validateRecordType(type: string): DnsRecordType {
  const normalized = type.toUpperCase() as DnsRecordType;
  if (!allowedRecordTypes.includes(normalized)) throw new Error('Unsupported DNS record type.');
  return normalized;
}

function validateTtl(input: unknown) {
  const ttl = Number(input || 300);
  if (!Number.isInteger(ttl) || ttl < 60 || ttl > 86400) throw new Error('TTL must be between 60 and 86400 seconds.');
  return ttl;
}

function validateRecordName(input: string) {
  const value = input.trim().toLowerCase() || '@';
  if (value === '@') return '@';
  if (value.length > 253) throw new Error('Record name is too long.');
  if (value.includes('..')) throw new Error('Record name cannot contain empty labels.');
  return value;
}

function validateRecordValue(valueInput: string) {
  const value = valueInput.trim();
  if (!value) throw new Error('Record value is required.');
  if (value.length > 1024) throw new Error('Record value is too long.');
  return value;
}

async function saveRegistry(registry: DomainRegistry) {
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  const tempPath = registryPath + '.' + process.pid + '.tmp';
  await fs.writeFile(tempPath, JSON.stringify(registry, null, 2), 'utf8');
  await fs.rename(tempPath, registryPath);
}

export async function readDomainRegistry(): Promise<DomainRegistry> {
  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DomainRegistry>;
    return { version: 1, domains: parsed.domains || [], records: parsed.records || [], audit: parsed.audit || [] };
  } catch {
    return emptyRegistry();
  }
}

function addAudit(registry: DomainRegistry, domainName: string, action: string, message: string) {
  registry.audit.push({ id: randomUUID(), domainName, action, message, createdAt: isoNow() });
}

export async function listDomains() {
  const registry = await readDomainRegistry();
  return registry.domains.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDomain(input: string) {
  const domainName = normalizeDomainName(input);
  const registry = await readDomainRegistry();
  const domain = registry.domains.find((item) => item.domainName === domainName) || null;
  if (!domain) return null;
  return {
    domain,
    records: registry.records.filter((record) => record.domainName === domainName),
    audit: registry.audit.filter((event) => event.domainName === domainName).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  };
}

export async function reserveDomain(input: { domainName: string; ownerId?: string; connectedSiteId?: string }) {
  const registry = await readDomainRegistry();
  const parsed = validateAftDomainName(input.domainName);
  if (registry.domains.some((domain) => domain.domainName === parsed.domainName)) throw new Error('Domain is already reserved.');

  const timestamp = isoNow();
  const domain: DomainRecord = {
    id: randomUUID(),
    domainName: parsed.domainName,
    label: parsed.label,
    zone: parsed.zone,
    status: input.connectedSiteId ? 'active' : 'reserved',
    ownerId: input.ownerId || 'local-owner',
    connectedSiteId: input.connectedSiteId,
    locked: true,
    autoRenew: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  registry.domains.push(domain);
  addAudit(registry, domain.domainName, 'domain.reserved', 'Domain was reserved in the internal AFT registry.');

  if (input.connectedSiteId) {
    registry.records.push({ id: randomUUID(), domainName: domain.domainName, type: 'AFT-LINK', name: '@', value: input.connectedSiteId, ttl: 300, createdAt: timestamp, updatedAt: timestamp });
    addAudit(registry, domain.domainName, 'domain.connected_site', 'Domain connected to a site.');
  }

  await saveRegistry(registry);
  return domain;
}

export async function connectDomainToSite(domainInput: string, siteId: string) {
  const registry = await readDomainRegistry();
  const domainName = normalizeDomainName(domainInput);
  const domainIndex = registry.domains.findIndex((domain) => domain.domainName === domainName);
  if (domainIndex === -1) throw new Error('Domain not found.');

  const timestamp = isoNow();
  registry.domains[domainIndex] = { ...registry.domains[domainIndex], status: 'active', connectedSiteId: siteId, updatedAt: timestamp };
  const linkIndex = registry.records.findIndex((record) => record.domainName === domainName && record.type === 'AFT-LINK' && record.name === '@');

  if (linkIndex >= 0) registry.records[linkIndex] = { ...registry.records[linkIndex], value: siteId, updatedAt: timestamp };
  else registry.records.push({ id: randomUUID(), domainName, type: 'AFT-LINK', name: '@', value: siteId, ttl: 300, createdAt: timestamp, updatedAt: timestamp });

  addAudit(registry, domainName, 'domain.connected_site', 'Domain connected to a site.');
  await saveRegistry(registry);
  return registry.domains[domainIndex];
}

export async function addDnsRecord(input: { domainName: string; type: string; name: string; value: string; ttl?: unknown; priority?: unknown }) {
  const registry = await readDomainRegistry();
  const domainName = normalizeDomainName(input.domainName);
  if (!registry.domains.some((item) => item.domainName === domainName)) throw new Error('Domain not found.');

  const type = validateRecordType(input.type);
  const name = validateRecordName(input.name || '@');
  const value = validateRecordValue(input.value);
  const ttl = validateTtl(input.ttl);
  const priority = input.priority === undefined || input.priority === '' ? undefined : Number(input.priority);
  if (priority !== undefined && (!Number.isInteger(priority) || priority < 0 || priority > 65535)) throw new Error('Priority must be between 0 and 65535.');

  const timestamp = isoNow();
  const record: DnsRecord = { id: randomUUID(), domainName, type, name, value, ttl, priority, createdAt: timestamp, updatedAt: timestamp };
  registry.records.push(record);
  addAudit(registry, domainName, 'dns.record_added', type + ' record added for ' + name + '.');
  await saveRegistry(registry);
  return record;
}

export async function listDnsRecords() {
  const registry = await readDomainRegistry();
  return registry.records.sort((a, b) => a.domainName.localeCompare(b.domainName) || a.name.localeCompare(b.name));
}
