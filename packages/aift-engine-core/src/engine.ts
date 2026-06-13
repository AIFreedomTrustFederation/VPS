import { appendRecord, readRecords, upsertRecord } from './file-store';
import type { AiftAppProfile, AiftAppSource, AiftBuildRun, AiftDependencyIssue, AiftLearningEvent, AiftOperatorReport, AiftProviderNodeUpdate, AiftWorkload } from './types';

function id(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function now() {
  return new Date().toISOString();
}

export function saveAppSource(source: AiftAppSource) {
  return upsertRecord<AiftAppSource>('app-sources', source);
}

export function listAppSources() {
  return readRecords<AiftAppSource>('app-sources');
}

export function createAppProfile(input: Partial<AiftAppProfile> & { source_id: string; repo: string }) {
  const timestamp = now();
  const profile: AiftAppProfile = {
    id: input.id || id('profile'),
    source_id: input.source_id,
    repo: input.repo,
    framework: input.framework || 'unknown',
    template_family: input.template_family || 'decentralized-service-app',
    found_files: input.found_files || 0,
    build_command: input.build_command,
    dev_command: input.dev_command,
    verify_command: input.verify_command,
    profile_ready: input.profile_ready ?? false,
    notes: input.notes || [],
    created_at: input.created_at || timestamp,
    updated_at: timestamp,
  };
  return upsertRecord<AiftAppProfile>('app-profiles', profile);
}

export function listAppProfiles() {
  return readRecords<AiftAppProfile>('app-profiles');
}

export function createBuildRun(input: Partial<AiftBuildRun> & { source_id: string; command: string }) {
  const timestamp = now();
  const record: AiftBuildRun = {
    id: input.id || id('build'),
    source_id: input.source_id,
    profile_id: input.profile_id,
    node_id: input.node_id,
    status: input.status || 'requested',
    command: input.command,
    log_path: input.log_path,
    started_at: input.started_at,
    finished_at: input.finished_at,
    created_at: input.created_at || timestamp,
    updated_at: timestamp,
  };
  return upsertRecord<AiftBuildRun>('build-runs', record);
}

export function listBuildRuns() {
  return readRecords<AiftBuildRun>('build-runs');
}

export function createWorkload(input: Partial<AiftWorkload> & { source_id: string }) {
  const timestamp = now();
  const record: AiftWorkload = {
    id: input.id || id('workload'),
    source_id: input.source_id,
    build_id: input.build_id,
    node_id: input.node_id,
    status: input.status || 'source-added',
    requested_by: input.requested_by,
    notes: input.notes || '',
    created_at: input.created_at || timestamp,
    updated_at: timestamp,
  };
  return upsertRecord<AiftWorkload>('workloads', record);
}

export function listWorkloads() {
  return readRecords<AiftWorkload>('workloads');
}

export function recordProviderNodeUpdate(input: Partial<AiftProviderNodeUpdate> & { node_id: string }) {
  const record: AiftProviderNodeUpdate = {
    id: input.id || id('node-update'),
    node_id: input.node_id,
    workload_id: input.workload_id,
    status: input.status || 'healthy',
    runtime_status: input.runtime_status || 'unknown',
    build_status: input.build_status,
    resource_status: input.resource_status,
    issue: input.issue,
    logs_path: input.logs_path,
    created_at: input.created_at || now(),
  };
  return appendRecord<AiftProviderNodeUpdate>('provider-node-updates', record);
}

export function listProviderNodeUpdates() {
  return readRecords<AiftProviderNodeUpdate>('provider-node-updates');
}

export function recordDependencyIssue(input: Partial<AiftDependencyIssue> & { bucket: string; action: string }) {
  const record: AiftDependencyIssue = {
    id: input.id || id('issue'),
    source_id: input.source_id,
    workload_id: input.workload_id,
    node_id: input.node_id,
    bucket: input.bucket,
    severity: input.severity || 'medium',
    action: input.action,
    created_at: input.created_at || now(),
  };
  return appendRecord<AiftDependencyIssue>('dependency-issues', record);
}

export function listDependencyIssues() {
  return readRecords<AiftDependencyIssue>('dependency-issues');
}

export function recordLearningEvent(input: Partial<AiftLearningEvent> & { event_type: string; summary: string }) {
  const record: AiftLearningEvent = {
    id: input.id || id('learn'),
    role: input.role || 'system',
    event_type: input.event_type,
    summary: input.summary,
    signal: input.signal || 5,
    source_id: input.source_id,
    workload_id: input.workload_id,
    node_id: input.node_id,
    created_at: input.created_at || now(),
  };
  return appendRecord<AiftLearningEvent>('learning-events', record);
}

export function listLearningEvents() {
  return readRecords<AiftLearningEvent>('learning-events');
}

export function generateOperatorReport(): AiftOperatorReport {
  const sources = listAppSources();
  const builds = listBuildRuns();
  const nodeUpdates = listProviderNodeUpdates();
  const issues = listDependencyIssues();
  const learningEvents = listLearningEvents();
  const activeBuilds = builds.filter((build) => ['requested', 'queued', 'running'].includes(build.status));
  const successfulBuilds = builds.filter((build) => build.status === 'passed');
  const failedBuilds = builds.filter((build) => build.status === 'failed');
  const healthyNodes = new Set(nodeUpdates.filter((update) => update.status === 'healthy').map((update) => update.node_id));
  const staleNodes = new Set(nodeUpdates.filter((update) => update.status === 'stale' || update.status === 'offline').map((update) => update.node_id));

  return {
    date: new Date().toISOString().slice(0, 10),
    connected_sources: sources.length,
    active_builds: activeBuilds.length,
    successful_builds: successfulBuilds.length,
    failed_builds: failedBuilds.length,
    active_nodes: healthyNodes.size,
    stale_nodes: staleNodes.size,
    issues: issues.length,
    recommended_actions: [
      sources.length ? 'Review connected app sources.' : 'Add the first app source.',
      activeBuilds.length ? 'Check active build logs.' : 'No active builds are running.',
      issues.length ? 'Review dependency or capacity issues.' : 'No recorded dependency issues.',
    ],
    learning_notes: learningEvents.slice(0, 8).map((event) => event.summary),
  };
}
