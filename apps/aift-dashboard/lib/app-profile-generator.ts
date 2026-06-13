import type { AppSource } from './app-sources';
import { upsertEngineRecord } from './engine-records';

type PackageJson = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type FileProbe = {
  path: string;
  found: boolean;
};

function now() {
  return new Date().toISOString();
}

function profileId(source: AppSource) {
  return `profile-${source.id}`;
}

function workloadId(source: AppSource) {
  return `workload-${source.id}`;
}

async function fetchRaw(source: AppSource, filePath: string) {
  const rawUrl = `https://raw.githubusercontent.com/${source.repo}/${source.branch}/${filePath}`;
  const response = await fetch(rawUrl, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.text();
}

async function probeFiles(source: AppSource, paths: string[]): Promise<FileProbe[]> {
  const results: FileProbe[] = [];
  for (const filePath of paths) {
    const content = await fetchRaw(source, filePath);
    results.push({ path: filePath, found: Boolean(content) });
  }
  return results;
}

function detectPackageManager(files: FileProbe[]) {
  if (files.some((file) => file.path === 'pnpm-lock.yaml' && file.found)) return 'pnpm';
  if (files.some((file) => file.path === 'yarn.lock' && file.found)) return 'yarn';
  if (files.some((file) => file.path === 'package-lock.json' && file.found)) return 'npm';
  return 'npm';
}

function detectFramework(pkg: PackageJson | null, files: FileProbe[]) {
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  if (deps.next || files.some((file) => file.path === 'next.config.js' && file.found) || files.some((file) => file.path === 'next.config.ts' && file.found)) return 'nextjs';
  if (deps.vite || files.some((file) => file.path === 'vite.config.ts' && file.found) || files.some((file) => file.path === 'vite.config.js' && file.found)) return 'vite';
  if (deps.react) return 'react';
  if (deps.express) return 'node-express';
  if (files.some((file) => file.path === 'Dockerfile' && file.found)) return 'docker';
  return 'unknown';
}

function selectInstallCommand(packageManager: string) {
  if (packageManager === 'pnpm') return 'pnpm install';
  if (packageManager === 'yarn') return 'yarn install';
  return 'npm install';
}

function selectBuildCommand(pkg: PackageJson | null, packageManager: string) {
  const scripts = pkg?.scripts || {};
  if (!scripts.build) return '';
  if (packageManager === 'pnpm') return 'pnpm build';
  if (packageManager === 'yarn') return 'yarn build';
  return 'npm run build';
}

function selectDevCommand(pkg: PackageJson | null, packageManager: string) {
  const scripts = pkg?.scripts || {};
  if (scripts.dev) return packageManager === 'pnpm' ? 'pnpm dev' : packageManager === 'yarn' ? 'yarn dev' : 'npm run dev';
  if (scripts.start) return packageManager === 'pnpm' ? 'pnpm start' : packageManager === 'yarn' ? 'yarn start' : 'npm start';
  return '';
}

function selectVerifyCommand(pkg: PackageJson | null, packageManager: string) {
  const scripts = pkg?.scripts || {};
  if (scripts.test) return packageManager === 'pnpm' ? 'pnpm test' : packageManager === 'yarn' ? 'yarn test' : 'npm test';
  if (scripts.lint) return packageManager === 'pnpm' ? 'pnpm lint' : packageManager === 'yarn' ? 'yarn lint' : 'npm run lint';
  return '';
}

export async function generateAppProfile(source: AppSource) {
  const paths = [
    'package.json',
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'next.config.js',
    'next.config.ts',
    'vite.config.js',
    'vite.config.ts',
    'Dockerfile',
    'README.md',
  ];

  const [packageText, files] = await Promise.all([
    fetchRaw(source, 'package.json'),
    probeFiles(source, paths),
  ]);

  const pkg = packageText ? JSON.parse(packageText) as PackageJson : null;
  const packageManager = detectPackageManager(files);
  const framework = detectFramework(pkg, files);
  const foundFiles = files.filter((file) => file.found).length;
  const timestamp = now();

  const profile = {
    id: profileId(source),
    source_id: source.id,
    repo: source.repo,
    branch: source.branch,
    framework,
    package_manager: packageManager,
    template_family: 'aift-decentralized-app',
    found_files: foundFiles,
    install_command: selectInstallCommand(packageManager),
    build_command: selectBuildCommand(pkg, packageManager),
    dev_command: selectDevCommand(pkg, packageManager),
    verify_command: selectVerifyCommand(pkg, packageManager),
    profile_ready: Boolean(pkg || framework !== 'unknown'),
    files,
    notes: [
      pkg ? 'package.json found.' : 'package.json was not found.',
      framework === 'unknown' ? 'Framework could not be detected yet.' : `Detected ${framework}.`,
      foundFiles ? `${foundFiles} known files found.` : 'No known launch files found yet.',
    ],
    created_at: timestamp,
    updated_at: timestamp,
  };

  const workload = {
    id: workloadId(source),
    source_id: source.id,
    profile_id: profile.id,
    status: profile.profile_ready ? 'profile-created' : 'source-added',
    notes: profile.profile_ready ? 'App profile created. Ready for dependency planning.' : 'App profile needs review before build planning.',
    created_at: timestamp,
    updated_at: timestamp,
  };

  upsertEngineRecord('app-profiles', profile);
  upsertEngineRecord('workloads', workload);

  return { profile, workload };
}
