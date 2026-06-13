export type AiftSourceStatus = 'connected' | 'analyzing' | 'profile-ready' | 'build-ready' | 'blocked';
export type AiftBuildStatus = 'requested' | 'queued' | 'running' | 'passed' | 'failed' | 'stopped';
export type AiftWorkloadStatus = 'source-added' | 'profile-created' | 'build-requested' | 'node-assigned' | 'build-running' | 'preview-running' | 'build-passed' | 'build-failed' | 'release-ready' | 'released' | 'stopped';
export type AiftNodeHealth = 'healthy' | 'stale' | 'limited' | 'offline';
export type AiftIssueSeverity = 'low' | 'medium' | 'high';

export type AiftAppSource = {
  id: string;
  label: string;
  repo: string;
  branch: string;
  url: string;
  status: AiftSourceStatus | string;
  created_at: string;
  updated_at?: string;
};

export type AiftAppProfile = {
  id: string;
  source_id: string;
  repo: string;
  framework: string;
  template_family: string;
  found_files: number;
  build_command?: string;
  dev_command?: string;
  verify_command?: string;
  profile_ready: boolean;
  notes: string[];
  created_at: string;
  updated_at: string;
};

export type AiftBuildRun = {
  id: string;
  source_id: string;
  profile_id?: string;
  node_id?: string;
  status: AiftBuildStatus;
  command: string;
  log_path?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
};

export type AiftWorkload = {
  id: string;
  source_id: string;
  build_id?: string;
  node_id?: string;
  status: AiftWorkloadStatus;
  requested_by?: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type AiftProviderNodeUpdate = {
  id: string;
  node_id: string;
  workload_id?: string;
  status: AiftNodeHealth;
  runtime_status: string;
  build_status?: string;
  resource_status?: string;
  issue?: string;
  logs_path?: string;
  created_at: string;
};

export type AiftDependencyIssue = {
  id: string;
  source_id?: string;
  workload_id?: string;
  node_id?: string;
  bucket: string;
  severity: AiftIssueSeverity;
  action: string;
  created_at: string;
};

export type AiftLearningEvent = {
  id: string;
  role: 'builder' | 'operator' | 'provider-node' | 'system' | 'webai';
  event_type: string;
  summary: string;
  signal: number;
  source_id?: string;
  workload_id?: string;
  node_id?: string;
  created_at: string;
};

export type AiftOperatorReport = {
  date: string;
  connected_sources: number;
  active_builds: number;
  successful_builds: number;
  failed_builds: number;
  active_nodes: number;
  stale_nodes: number;
  issues: number;
  recommended_actions: string[];
  learning_notes: string[];
};
