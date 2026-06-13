import { existsSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { NextResponse } from 'next/server';

function rootDir() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(current, '.git')) && existsSync(path.join(current, 'apps'))) return current;
    current = path.dirname(current);
  }
  return process.cwd();
}

function git(args: string[], cwd: string) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 120000 });
}

export async function GET() {
  const root = rootDir();
  const branchResult = git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
  const branch = (branchResult.stdout || 'main').trim() || 'main';
  git(['fetch', 'origin', branch], root);
  const count = git(['rev-list', '--left-right', '--count', `HEAD...origin/${branch}`], root);
  const parts = (count.stdout || '').trim().split(/\s+/).map(Number);
  const ahead = Number.isFinite(parts[0]) ? parts[0] : 0;
  const behind = Number.isFinite(parts[1]) ? parts[1] : 0;
  const state = ahead > 0 && behind > 0 ? 'diverged' : ahead > 0 ? 'ahead' : behind > 0 ? 'behind' : 'up-to-date';

  return NextResponse.json({ ok: count.status === 0, root, branch, state, ahead, behind });
}
