#!/usr/bin/env node
import fs from 'fs';
import os from 'os';
import path from 'path';

const home = process.env.AIFT_HOME || path.join(os.homedir(), '.aift-webai');
const runtimeDir = path.join(home, 'runtime');
const registryFile = path.join(runtimeDir, 'aift-repos.json');
const now = new Date().toISOString();

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

fs.mkdirSync(runtimeDir, { recursive: true });
const registry = readJson(registryFile, { version: 1, repos: [], updatedAt: now });
const rootRepo = {
  id: 'aift-root',
  slug: 'aift-root',
  name: 'AI Freedom Trust Federation Root',
  description: 'Public identity and doctrine root mirrored from GitHub while runtime source of truth moves to AIFT-operated relay and node registry.',
  sourceType: 'mirror',
  localPath: path.join(os.homedir(), 'AIFreedomTrustFederation'),
  defaultBranch: 'main',
  status: 'active',
  ownerNodeId: process.env.AIFT_NODE_ID || 'aift-vps-relay-root',
  createdAt: now,
  updatedAt: now,
};

const index = registry.repos.findIndex((repo) => repo.id === rootRepo.id || repo.slug === rootRepo.slug);
if (index >= 0) registry.repos[index] = { ...registry.repos[index], ...rootRepo, createdAt: registry.repos[index].createdAt || now, updatedAt: now };
else registry.repos.push(rootRepo);
registry.updatedAt = now;
fs.writeFileSync(registryFile, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
console.log(`[AIFT repo] seeded ${rootRepo.id}`);
console.log(`[AIFT repo] registry: ${registryFile}`);
