#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
let failures = 0;

function relPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function ok(message) {
  console.log(`GREEN ${message}`);
}

function fail(message) {
  failures += 1;
  console.error(`RED ${message}`);
}

function checkFile(relativePath, label = relativePath) {
  if (exists(relativePath)) ok(`${label} present`);
  else fail(`${label} missing: ${relativePath}`);
}

function checkPackageWorkspaces(packageJson) {
  if (!Array.isArray(packageJson.workspaces)) {
    fail('package.json workspaces must be an array.');
    return;
  }

  const workspaceSet = new Set(packageJson.workspaces);
  const expectedWorkspaces = ['apps/aift-dashboard', 'apps/aift-desktop', 'apps/aift-node-agent'];

  for (const workspace of expectedWorkspaces) {
    if (!workspaceSet.has(workspace)) fail(`package.json workspaces missing ${workspace}`);
  }

  for (const workspace of packageJson.workspaces) {
    const workspacePackage = path.join(workspace, 'package.json');
    if (!exists(workspace)) {
      fail(`workspace directory missing: ${workspace}`);
    } else if (!exists(workspacePackage)) {
      fail(`workspace package missing: ${workspacePackage}`);
    } else {
      ok(`workspace valid: ${workspace}`);
    }
  }
}

function checkWorkspaceScripts(packageJson) {
  const workspaceSet = new Set(packageJson.workspaces || []);
  const scripts = packageJson.scripts || {};
  const workspacePattern = /npm\s+--workspace\s+([^\s]+)\s+run\s+/g;

  for (const [scriptName, command] of Object.entries(scripts)) {
    workspacePattern.lastIndex = 0;
    for (const match of command.matchAll(workspacePattern)) {
      const workspace = match[1];
      if (!workspaceSet.has(workspace)) {
        fail(`script ${scriptName} targets non-workspace ${workspace}`);
      } else {
        ok(`script ${scriptName} targets workspace ${workspace}`);
      }
    }
  }
}

function checkAndroidRuntime() {
  const androidFiles = [
    'android/aift-cloud-runtime/README.md',
    'android/aift-cloud-runtime/app/build.gradle',
    'android/aift-cloud-runtime/app/src/main/AndroidManifest.xml',
    'android/aift-cloud-runtime/app/src/main/java/org/aift/cloud/AiftCloudActivity.java',
    'android/aift-cloud-runtime/app/src/main/java/org/aift/cloud/AiftRuntimeManager.java',
    'android/aift-cloud-runtime/app/src/main/java/org/aift/cloud/AiftRuntimeService.java',
    'android/aift-cloud-runtime/app/src/main/java/org/aift/cloud/AiftTermuxBridge.java.template',
    'scripts/aift-android-runtime-bootstrap.sh',
    'scripts/aift-build-android-runtime.sh',
  ];

  for (const file of androidFiles) checkFile(file);
}

function checkRegistryExamples() {
  const registries = [
    'registry-examples/builds.yml',
    'registry-examples/connected-repositories.yml',
    'registry-examples/deployments.yml',
    'registry-examples/nodes.yml',
    'registry-examples/template-packages.yml',
    'registry-examples/templates.yml',
  ];

  for (const registry of registries) checkFile(registry);
}

function main() {
  console.log('AIFT VPS STRUCTURE CHECK');
  console.log(`Root: ${relPath(root)}`);

  const requiredFiles = [
    'README.md',
    'README-V2.md',
    'AGENTS.md',
    'package.json',
    'aift.schema.yml',
    'aift.node.schema.yml',
    'docs/status.md',
    'docs/validation.md',
    'docs/security-and-privacy.md',
    'docs/security-baseline.md',
    'docs/secret-management-policy.md',
    'docs/production-readiness-rules.md',
    'docs/runtime-contract.md',
    'docs/aift-vps-node-app-foundation.md',
    'apps/aift-node-app/README.md',
    'apps/aift-node-app/foundation-checklist.yml',
    'packages/aift-node-core/README.md',
    'scripts/aift-validate-installer-registry.mjs',
  ];

  for (const file of requiredFiles) checkFile(file);

  let packageJson;
  try {
    packageJson = readJson('package.json');
    ok('package.json parses as JSON');
  } catch (error) {
    fail(`package.json is invalid JSON: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  checkPackageWorkspaces(packageJson);
  checkWorkspaceScripts(packageJson);
  checkAndroidRuntime();
  checkRegistryExamples();

  if (failures > 0) {
    console.error(`RED Structure check failed with ${failures} issue(s).`);
    process.exitCode = 1;
    return;
  }

  ok('AIFT VPS structure check passed.');
}

main();
