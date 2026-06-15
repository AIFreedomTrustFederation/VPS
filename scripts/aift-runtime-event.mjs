#!/usr/bin/env node
import fs from 'fs';
import os from 'os';
import path from 'path';

const home = process.env.AIFT_HOME || path.join(os.homedir(), '.aift-webai');
const logDir = path.join(home, 'logs');
const eventFile = path.join(logDir, 'uptime-events.jsonl');
const event = process.argv[2] || 'event';
const detail = process.argv.slice(3).join(' ');

fs.mkdirSync(logDir, { recursive: true });
fs.appendFileSync(eventFile, `${JSON.stringify({
  event,
  detail,
  at: new Date().toISOString(),
})}\n`, 'utf8');

console.log(`[AIFT event] ${event}${detail ? ` - ${detail}` : ''}`);
console.log(`[AIFT event] log: ${eventFile}`);
