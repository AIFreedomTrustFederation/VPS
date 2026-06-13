import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

export type CollectionName =
  | 'app-sources'
  | 'app-profiles'
  | 'build-runs'
  | 'workloads'
  | 'provider-node-updates'
  | 'dependency-issues'
  | 'learning-events';

function aiftHome() {
  return process.env.AIFT_HOME || path.join(homedir(), '.aift-webai');
}

function collectionDir(collection: CollectionName) {
  return path.join(aiftHome(), 'engine', collection);
}

function collectionFile(collection: CollectionName) {
  return path.join(collectionDir(collection), 'records.json');
}

export function ensureCollection(collection: CollectionName) {
  const dir = collectionDir(collection);
  mkdirSync(dir, { recursive: true });
  const file = collectionFile(collection);
  if (!existsSync(file)) writeFileSync(file, JSON.stringify({ records: [] }, null, 2));
  return file;
}

export function readRecords<T>(collection: CollectionName): T[] {
  const file = ensureCollection(collection);
  try {
    const data = JSON.parse(readFileSync(file, 'utf8')) as { records?: T[] };
    return Array.isArray(data.records) ? data.records : [];
  } catch {
    return [];
  }
}

export function writeRecords<T>(collection: CollectionName, records: T[]) {
  const file = ensureCollection(collection);
  writeFileSync(file, JSON.stringify({ records }, null, 2));
}

export function upsertRecord<T extends { id: string }>(collection: CollectionName, record: T) {
  const records = readRecords<T>(collection);
  const index = records.findIndex((item) => item.id === record.id);
  if (index >= 0) records[index] = record;
  else records.unshift(record);
  writeRecords(collection, records);
  return record;
}

export function appendRecord<T extends { id: string }>(collection: CollectionName, record: T) {
  const records = readRecords<T>(collection);
  records.unshift(record);
  writeRecords(collection, records);
  return record;
}
