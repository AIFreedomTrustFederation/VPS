import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

export type AppSource = {
  id: string;
  label: string;
  repo: string;
  branch: string;
  status: string;
  url: string;
  created_at: string;
};

type AppSourceFile = {
  sources: AppSource[];
};

const seedSources: AppSource[] = [
  {
    id: 'capital-city-provisions',
    label: 'Capital City Provisions',
    repo: 'AIFreedomTrustFederation/capital-city-provisions',
    branch: 'main',
    status: 'connected',
    url: 'https://github.com/AIFreedomTrustFederation/capital-city-provisions',
    created_at: new Date(0).toISOString(),
  },
];

export function getAppSourceHome() {
  return process.env.AIFT_HOME || path.join(homedir(), '.aift-webai');
}

export function getAppSourceFilePath() {
  return path.join(getAppSourceHome(), 'app-sources', 'sources.json');
}

function getEngineSourceFilePath() {
  return path.join(getAppSourceHome(), 'engine', 'app-sources', 'records.json');
}

function readEngineSources(): AppSource[] {
  const filePath = getEngineSourceFilePath();
  mkdirSync(path.dirname(filePath), { recursive: true });

  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify({ records: [] }, null, 2));
  }

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8')) as { records?: AppSource[] };
    return Array.isArray(data.records) ? data.records : [];
  } catch {
    return [];
  }
}

function writeEngineSources(records: AppSource[]) {
  const filePath = getEngineSourceFilePath();
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify({ records }, null, 2));
}

function mirrorSourceToEngine(source: AppSource) {
  const records = readEngineSources();
  const index = records.findIndex((record) => record.id === source.id || record.repo.toLowerCase() === source.repo.toLowerCase());

  if (index >= 0) records[index] = source;
  else records.unshift(source);

  writeEngineSources(records);
}

export function ensureAppSourceFile() {
  const filePath = getAppSourceFilePath();
  mkdirSync(path.dirname(filePath), { recursive: true });

  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify({ sources: seedSources }, null, 2));
    seedSources.forEach(mirrorSourceToEngine);
  }

  return filePath;
}

export function readAppSources(): AppSource[] {
  const filePath = ensureAppSourceFile();
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8')) as AppSourceFile;
    const sources = Array.isArray(data.sources) ? data.sources : [];
    sources.forEach(mirrorSourceToEngine);
    return sources;
  } catch {
    return [];
  }
}

export function writeAppSources(sources: AppSource[]) {
  const filePath = ensureAppSourceFile();
  writeFileSync(filePath, JSON.stringify({ sources }, null, 2));
  sources.forEach(mirrorSourceToEngine);
}

export function parseGitHubRepoUrl(input: string) {
  const clean = input.trim().replace(/\.git$/, '');
  const match = clean.match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+)(?:[/#?].*)?$/i) || clean.match(/^([^/\s]+)\/([^/\s]+)$/);

  if (!match) return null;

  const owner = match[1];
  const repoName = match[2];
  const repo = `${owner}/${repoName}`;
  const id = repo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return {
    id,
    label: repoName.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    repo,
    url: `https://github.com/${repo}`,
  };
}

export function addAppSource(inputUrl: string) {
  const parsed = parseGitHubRepoUrl(inputUrl);
  if (!parsed) {
    return { ok: false as const, error: 'Enter a valid GitHub repository URL.' };
  }

  const sources = readAppSources();
  const existing = sources.find((source) => source.repo.toLowerCase() === parsed.repo.toLowerCase());
  if (existing) {
    mirrorSourceToEngine(existing);
    return { ok: true as const, source: existing, created: false };
  }

  const source: AppSource = {
    ...parsed,
    branch: 'main',
    status: 'connected',
    created_at: new Date().toISOString(),
  };

  writeAppSources([source, ...sources]);
  mirrorSourceToEngine(source);
  return { ok: true as const, source, created: true };
}
