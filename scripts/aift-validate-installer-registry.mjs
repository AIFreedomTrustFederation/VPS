#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const registryPath = process.argv[2] || path.join('android', 'aift-installer-registry.json');
const requiredFields = [
  'id',
  'title',
  'package_name',
  'release_tag',
  'apk_name',
  'download_url',
  'install_order',
  'requires',
  'can_install_async',
  'start_after_install',
  'health_check_url',
  'handoff_url',
  'start_url',
];

function fail(message) {
  console.error(`RED ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`GREEN ${message}`);
}

if (!fs.existsSync(registryPath)) {
  fail(`Registry missing: ${registryPath}`);
  process.exit(1);
}

let registry;
try {
  registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
} catch (error) {
  fail(`Registry JSON is invalid: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(registry.installers)) {
  fail('Registry must contain installers array.');
  process.exit(1);
}

const ids = new Set();
const orders = new Set();
for (const item of registry.installers) {
  for (const field of requiredFields) {
    if (!(field in item)) fail(`${item.id || 'unknown'} missing ${field}`);
  }
  if (ids.has(item.id)) fail(`Duplicate installer id: ${item.id}`);
  ids.add(item.id);
  if (orders.has(item.install_order)) fail(`Duplicate install_order: ${item.install_order}`);
  orders.add(item.install_order);
  if (!Array.isArray(item.requires)) fail(`${item.id} requires must be an array.`);
  for (const dep of item.requires || []) {
    if (!registry.installers.some((candidate) => candidate.id === dep)) fail(`${item.id} requires unknown dependency ${dep}`);
  }
  if (!String(item.download_url).startsWith('https://github.com/AIFreedomTrustFederation/VPS/releases/download/')) {
    fail(`${item.id} download_url must use the AIFT VPS GitHub releases path.`);
  }
}

if (!process.exitCode) ok(`Installer registry valid: ${registry.installers.length} installers`);
