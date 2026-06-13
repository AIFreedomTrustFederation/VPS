import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

export type EngineCollection =
  | 'app-sources'
  | 'app-profiles'
  | 'build-runs'
  | 'workloads'
  | 'provider-node-updates'
  | 'dependency-issues'
  | 'learning-events';

export function engineHome() {
  return process.env.AIFT_HOME || path.join(homedir(), '.aift-webai');
}

export function engineCollectionFile(collection: EngineCollection) {
  return path.join(engineHome(), 'engine', collection, 'records.json');
}

export function readEngineRecords<T>(collection: EngineCollection): T[] {
  const filePath = engineCollectionFile(collection);
  mkdirSync(path.dirname(filePath), { recursive: true });

  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify({ records: [] }, null, 2));
  }

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8')) as { records?: T[] };
    return Array.isArray(data.records) ? data.records : [];
  } catch {
    return [];
  }
}

export function writeEngineRecords<T>(collection: EngineCollection, records: T[]) {
  const filePath = engineCollectionFile(collection);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify({ records }, null, 2));
}

export function upsertEngineRecord<T extends { id: string }>(collection: EngineCollection, record: T) {
  const records = readEngineRecords<T>(collection);
  const index = records.findIndex((item) => item.id === record.id);
  if (index >= 0) records[index] = record;
  else records.unshift(record);
  writeEngineRecords(collection, records);
  return record;
}
