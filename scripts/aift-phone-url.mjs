#!/usr/bin/env node
import os from 'os';
import fs from 'fs';
import path from 'path';

const port = Number(process.argv[2] || process.env.APP_PORT || process.env.AIFT_ROUTER_PORT || 3001);
const home = process.env.AIFT_HOME || path.join(os.homedir(), '.aift-webai');
const runtimeDir = path.join(home, 'runtime');
const outFile = path.join(runtimeDir, 'phone-url.json');

function pickIp() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const entries of Object.values(nets)) {
    for (const entry of entries || []) {
      if (entry.family !== 'IPv4') continue;
      if (entry.internal) continue;
      candidates.push(entry.address);
    }
  }

  const preferred = candidates.find((ip) => ip.startsWith('192.168.'))
    || candidates.find((ip) => ip.startsWith('10.'))
    || candidates.find((ip) => /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip))
    || candidates[0];

  return preferred || '127.0.0.1';
}

const ip = pickIp();
const payload = {
  ip,
  port,
  local_url: `http://127.0.0.1:${port}`,
  phone_url: `http://${ip}:${port}`,
  updated_at: new Date().toISOString(),
};

fs.mkdirSync(runtimeDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(`[AIFT VPS] Phone IP: ${payload.ip}`);
console.log(`[AIFT VPS] Local URL: ${payload.local_url}`);
console.log(`[AIFT VPS] Phone/LAN URL: ${payload.phone_url}`);
console.log(`[AIFT VPS] URL status file: ${outFile}`);
