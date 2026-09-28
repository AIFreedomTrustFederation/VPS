#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function fail(message) {
  console.error(`RED ${message}`);
  process.exitCode = 1;
}

function trackedFiles(pathspec) {
  const result = spawnSync('git', ['ls-files', '-z', '--', pathspec], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    fail(`Could not list tracked ${pathspec} files: ${result.stderr.trim()}`);
    return [];
  }

  return result.stdout.split('\0').filter(Boolean);
}

function check(command, args, file) {
  const result = spawnSync(command, [...args, file], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    fail(`${file} failed syntax validation${detail ? `: ${detail}` : ''}`);
    return false;
  }

  return true;
}

const shellFiles = trackedFiles('scripts/*.sh');
const posixShellFiles = trackedFiles('.aift/commands/status.sh');
const nodeFiles = trackedFiles('scripts/*.mjs');

if (shellFiles.length === 0) fail('No tracked operational shell scripts found.');
if (posixShellFiles.length === 0) fail('No tracked AIFT status command found.');
if (nodeFiles.length === 0) fail('No tracked Node.js validation scripts found.');

const validShellFiles = shellFiles.filter((file) => check('bash', ['-n'], file));
const validPosixShellFiles = posixShellFiles.filter((file) => check('sh', ['-n'], file));
const validNodeFiles = nodeFiles.filter((file) => check(process.execPath, ['--check'], file));

if (!process.exitCode) {
  console.log(
    `GREEN Source syntax valid: ${validShellFiles.length} Bash scripts, ${validPosixShellFiles.length} POSIX shell command, ${validNodeFiles.length} Node.js scripts`,
  );
}
