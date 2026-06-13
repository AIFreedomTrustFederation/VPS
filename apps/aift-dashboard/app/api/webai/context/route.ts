import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';

type SourceStatus = {
  id: string;
  label: string;
  path: string;
  exists: boolean;
  size_bytes?: number;
  updated_at?: string;
};

type DirectoryStatus = {
  id: string;
  label: string;
  path: string;
  exists: boolean;
  file_count: number;
  files: string[];
};

const repoFiles = [
  ['readme_v2', 'README-V2', 'README-V2.md'],
  ['live_data_policy', 'Live data policy', 'docs/live-data-policy.md'],
  ['decentralized_webai', 'Decentralized WebAI', 'docs/decentralized-webai.md'],
  ['open_source_ai_runtime', 'Open-source AI runtime', 'docs/open-source-ai-runtime.md'],
  ['webai_chat', 'WebAI chat', 'docs/webai-chat.md'],
  ['runtime_contract', 'Runtime contract', 'docs/runtime-contract.md'],
  ['node_app_screen_flow', 'Node app screen flow', 'docs/node-app-screen-flow.md'],
  ['node_app_foundation', 'Node app foundation', 'docs/aift-vps-node-app-foundation.md'],
  ['node_app_checklist', 'Node app foundation checklist', 'apps/aift-node-app/foundation-checklist.yml'],
  ['node_core_readme', 'AIFT Node Core README', 'packages/aift-node-core/README.md'],
];

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

function fileStatus(repoRoot: string, id: string, label: string, relativePath: string): SourceStatus {
  const fullPath = path.join(repoRoot, relativePath);
  if (!existsSync(fullPath)) {
    return { id, label, path: relativePath, exists: false };
  }

  const stat = statSync(fullPath);
  return {
    id,
    label,
    path: relativePath,
    exists: true,
    size_bytes: stat.size,
    updated_at: stat.mtime.toISOString(),
  };
}

function directoryStatus(id: string, label: string, directoryPath: string): DirectoryStatus {
  if (!existsSync(directoryPath)) {
    return { id, label, path: directoryPath, exists: false, file_count: 0, files: [] };
  }

  const files = readdirSync(directoryPath)
    .filter((entry) => {
      try {
        return statSync(path.join(directoryPath, entry)).isFile();
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

function readSmallJsonFiles(directoryPath: string) {
  if (!existsSync(directoryPath)) return [];

  return readdirSync(directoryPath)
    .filter((file) => file.endsWith('.json'))
    .slice(0, 10)
    .map((file) => {
      const fullPath = path.join(directoryPath, file);
      try {
        const raw = readFileSync(fullPath, 'utf8');
        return { file, json: JSON.parse(raw) };
      } catch {
        return { file, json: null };
      }
    });
}

function recommendedNextStep(repoStatuses: SourceStatus[], aiftHomes: string[], heartbeatCount: number, nodeCardCount: number) {
  const missingCoreDoc = repoStatuses.find((item) => !item.exists);
  if (missingCoreDoc) return `Add or restore ${missingCoreDoc.path}.`;
  if (aiftHomes.length === 0) return 'Start a real AIFT VPS node so local runtime folders exist.';
  if (heartbeatCount === 0) return 'Run heartbeat or discovery on a real node.';
  if (nodeCardCount === 0) return 'Export a real node card from the active node.';
  return 'Connect WebAI chat storage to this real context.';
}

export async function GET() {
  const repoRoot = findRepoRoot();
  const repoStatuses = repoFiles.map(([id, label, relativePath]) => fileStatus(repoRoot, id, label, relativePath));
  const aiftHomes = discoverAiftHomes();

  const nodeContexts = aiftHomes.map((aiftHome) => {
    const heartbeats = directoryStatus('heartbeats', 'Heartbeats', path.join(aiftHome, 'heartbeats'));
    const nodeCards = directoryStatus('node_cards', 'Node cards', path.join(aiftHome, 'node-cards'));
    const logs = directoryStatus('logs', 'Logs', path.join(aiftHome, 'logs'));

    return {
      aift_home: aiftHome,
      heartbeats,
      node_cards: nodeCards,
      logs,
      heartbeat_records: readSmallJsonFiles(path.join(aiftHome, 'heartbeats')),
    };
  });

  const heartbeatCount = nodeContexts.reduce((total, item) => total + item.heartbeats.file_count, 0);
  const nodeCardCount = nodeContexts.reduce((total, item) => total + item.node_cards.file_count, 0);

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    repo_root: repoRoot,
    repo_context: repoStatuses,
    node_context: nodeContexts,
    summary: {
      repo_files_found: repoStatuses.filter((item) => item.exists).length,
      repo_files_missing: repoStatuses.filter((item) => !item.exists).length,
      aift_home_count: aiftHomes.length,
      heartbeat_file_count: heartbeatCount,
      node_card_file_count: nodeCardCount,
    },
    recommended_next_step: recommendedNextStep(repoStatuses, aiftHomes, heartbeatCount, nodeCardCount),
  });
}
