import { appendFileSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

export function actionLogDir() {
  const aiftHome = process.env.AIFT_HOME || path.join(homedir(), '.aift-webai');
  const dir = path.join(aiftHome, 'webai', 'terminal-logs');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeLocalActionLog(action: string, output: string) {
  const safeAction = action.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const dir = actionLogDir();
  const text = output || 'No output returned.';
  const file = path.join(dir, `${safeAction}.log`);
  appendFileSync(file, `\n--- ${new Date().toISOString()} ${safeAction} ---\n${text}\n`);
  writeFileSync(path.join(dir, 'latest.log'), text);
  return file;
}
