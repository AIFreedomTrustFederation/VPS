#!/usr/bin/env node
import fs from 'fs';
import os from 'os';
import path from 'path';

const home = process.env.AIFT_HOME || path.join(os.homedir(), '.aift-webai');
const runtimeDir = path.join(home, 'runtime');
const identityFile = path.join(runtimeDir, 'node-identity.json');
const phoneUrlFile = path.join(runtimeDir, 'phone-url.json');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function safeId(value) {
  return String(value || 'aift-termux-node').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
}

fs.mkdirSync(runtimeDir, { recursive: true });
const previous = readJson(identityFile, {});
const phone = readJson(phoneUrlFile, {});
const now = new Date().toISOString();
const hostnameId = safeId(`aift-${os.hostname() || 'termux-node'}`);
const nodeId = safeId(process.env.AIFT_NODE_ID || previous.node_id || hostnameId);
const deviceName = process.env.AIFT_DEVICE_NAME || previous.device_name || os.hostname() || 'termux-node';

const identity = {
  node_id: nodeId,
  device_name: deviceName,
  role: process.env.AIFT_NODE_ROLE || previous.role || 'mobile-provider-node',
  platform: process.platform,
  arch: process.arch,
  last_known_ip: phone.ip || previous.last_known_ip || '127.0.0.1',
  last_known_url: phone.phone_url || previous.last_known_url || '',
  created_at: previous.created_at || now,
  last_seen_at: now,
};

fs.writeFileSync(identityFile, `${JSON.stringify(identity, null, 2)}\n`, 'utf8');
console.log(`[AIFT node] ${identity.node_id}`);
console.log(`[AIFT node] ${identity.device_name}`);
console.log(`[AIFT node] ${identity.last_known_url || identity.last_known_ip}`);
console.log(`[AIFT node] identity: ${identityFile}`);
