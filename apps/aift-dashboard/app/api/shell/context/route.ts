import { existsSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';

type FileGroup = {
  id: string;
  label: string;
  path: string;
  exists: boolean;
  file_count: number;
  files: string[];
};

function findRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(current, 'README.md')) && existsSync(path.join(current, 'apps'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}

function listFiles(id: string, label: string, directoryPath: string, extensions?: string[]): FileGroup {
  if (!existsSync(directoryPath)) {
    return { id, label, path: directoryPath, exists: false, file_count: 0, files: [] };
  }

  const files = readdirSync(directoryPath)
    .filter((entry) => {
      const fullPath = path.join(directoryPath, entry);
      try {
        if (!statSync(fullPath).isFile()) return false;
        if (!extensions || extensions.length === 0) return true;
        return extensions.some((extension) => entry.endsWith(extension));
      } catch {
        return false;
      }
    })
    .sort();

  return {
    id,
    label,
    path: directoryPath,
    exists: true,
    file_count: files.length,
    files: files.slice(0, 25),
  };
}

function listDirectories(id: string, label: string, directoryPath: string): FileGroup {
  if (!existsSync(directoryPath)) {
    return { id, label, path: directoryPath, exists: false, file_count: 0, files: [] };
  }

  const directories = readdirSync(directoryPath)
    .filter((entry) => {
      const fullPath = path.join(directoryPath, entry);
      try {
        return statSync(fullPath).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();

  return {
    id,
    label,
    path: directoryPath,
    exists: true,
    file_count: directories.length,
    files: directories.slice(0, 25),
  };
}

function discoverAiftHomes() {
  const home = homedir();
  if (!existsSync(home)) return [];

  return readdirSync(home)
    .filter((entry) => entry === '.aift' || entry.startsWith('.aift-'))
    .map((entry) => path.join(home, entry))
    .filter((entryPath) => {
      try {
        return statSync(entryPath).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
}

export async function GET() {
  const repoRoot = findRepoRoot();
  const apps = listDirectories('apps', 'Apps', path.join(repoRoot, 'apps'));
  const templates = listDirectories('templates', 'Templates', path.join(repoRoot, 'templates'));
  const registryExamples = listFiles('registry_examples', 'Registry examples', path.join(repoRoot, 'registry-examples'), ['.yml', '.yaml', '.json']);
  const docs = listFiles('docs', 'Docs', path.join(repoRoot, 'docs'), ['.md']);
  const scripts = listFiles('scripts', 'Scripts', path.join(repoRoot, 'scripts'), ['.sh']);

  const aiftHomes = discoverAiftHomes();
  const nodes = aiftHomes.map((aiftHome) => ({
    aift_home: aiftHome,
    heartbeats: listFiles('heartbeats', 'Heartbeats', path.join(aiftHome, 'heartbeats'), ['.json']),
    node_cards: listFiles('node_cards', 'Node cards', path.join(aiftHome, 'node-cards'), ['.card']),
    logs: listFiles('logs', 'Logs', path.join(aiftHome, 'logs'), ['.log']),
  }));

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    repo_root: repoRoot,
    groups: {
      apps,
      templates,
      registry_examples: registryExamples,
      docs,
      scripts,
    },
    nodes,
    summary: {
      apps: apps.file_count,
      templates: templates.file_count,
      registry_examples: registryExamples.file_count,
      docs: docs.file_count,
      scripts: scripts.file_count,
      runtime_folders: aiftHomes.length,
      heartbeat_files: nodes.reduce((total, node) => total + node.heartbeats.file_count, 0),
      node_card_files: nodes.reduce((total, node) => total + node.node_cards.file_count, 0),
      log_files: nodes.reduce((total, node) => total + node.logs.file_count, 0),
    },
  });
}
