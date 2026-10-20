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
  // Bind the download to the declared release and APK, not merely the release URL prefix.
  const validTag = typeof item.release_tag === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item.release_tag);
  const validApk = typeof item.apk_name === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*\.apk$/.test(item.apk_name);
  if (!validTag) fail(`${item.id} release_tag must be a safe single path segment.`);
  if (!validApk) fail(`${item.id} apk_name must be a safe APK filename.`);
  if (validTag && validApk && item.download_url !==
      `https://github.com/AIFreedomTrustFederation/VPS/releases/download/${item.release_tag}/${item.apk_name}`) {
    fail(`${item.id} download_url must match its release_tag and apk_name exactly.`);
  }
}

if (!process.exitCode) ok(`Installer registry valid: ${registry.installers.length} installers`);
