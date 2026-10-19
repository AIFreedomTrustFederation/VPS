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
const installersById = new Map(registry.installers.map((item) => [item.id, item]));
for (const item of registry.installers) {
  for (const field of requiredFields) {
    if (!(field in item)) fail(`${item.id || 'unknown'} missing ${field}`);
  }
  if (ids.has(item.id)) fail(`Duplicate installer id: ${item.id}`);
  ids.add(item.id);
  if (orders.has(item.install_order)) fail(`Duplicate install_order: ${item.install_order}`);
  orders.add(item.install_order);
  if (!Number.isSafeInteger(item.install_order) || item.install_order < 0) {
    fail(`${item.id} install_order must be a nonnegative safe integer.`);
  }
  if (!Array.isArray(item.requires)) fail(`${item.id} requires must be an array.`);
  for (const dep of Array.isArray(item.requires) ? item.requires : []) {
    const prerequisite = installersById.get(dep);
    if (!prerequisite) {
      fail(`${item.id} requires unknown dependency ${dep}`);
    } else if (
      Number.isSafeInteger(item.install_order) &&
      Number.isSafeInteger(prerequisite.install_order) &&
      prerequisite.install_order >= item.install_order
    ) {
      fail(`${item.id} requires ${dep} at an earlier install_order.`);
    }
  }
  // A textual prefix is insufficient: URL normalization resolves ../ and %2e%2e
  // segments, potentially moving the download into another repository.
  const validAssetSegment = (value) =>
    typeof value === 'string' &&
    value.length > 0 &&
    value !== '.' &&
    value !== '..' &&
    !/[\/\\?#%\x00-\x1f]/.test(value);
  if (!validAssetSegment(item.release_tag) || !validAssetSegment(item.apk_name)) {
    fail(`${item.id} release_tag and apk_name must be valid single path segments.`);
  } else {
    const expectedUrl = `https://github.com/AIFreedomTrustFederation/VPS/releases/download/${encodeURIComponent(item.release_tag)}/${encodeURIComponent(item.apk_name)}`;
    if (item.download_url !== expectedUrl) {
      fail(`${item.id} download_url must match its AIFT VPS release_tag and apk_name exactly.`);
    }
  }
}

if (!process.exitCode) ok(`Installer registry valid: ${registry.installers.length} installers`);
