create table if not exists app_sources (
  id text primary key,
  label text not null,
  repo text not null,
  branch text not null,
  url text not null,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz
);

create table if not exists app_profiles (
  id text primary key,
  source_id text not null,
  repo text not null,
  framework text not null,
  template_family text not null,
  found_files integer not null default 0,
  build_command text,
  dev_command text,
  verify_command text,
  profile_ready boolean not null default false,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists build_runs (
  id text primary key,
  source_id text not null,
  profile_id text,
  node_id text,
  status text not null,
  command text not null,
  log_path text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists workloads (
  id text primary key,
  source_id text not null,
  build_id text,
  node_id text,
  status text not null,
  requested_by text,
  notes text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists provider_node_updates (
  id text primary key,
  node_id text not null,
  workload_id text,
  status text not null,
  runtime_status text not null,
  build_status text,
  resource_status text,
  issue text,
  logs_path text,
  created_at timestamptz not null
);

create table if not exists dependency_issues (
  id text primary key,
  source_id text,
  workload_id text,
  node_id text,
  bucket text not null,
  severity text not null,
  action text not null,
  created_at timestamptz not null
);

create table if not exists learning_events (
  id text primary key,
  role text not null,
  event_type text not null,
  summary text not null,
  signal integer not null,
  source_id text,
  workload_id text,
  node_id text,
  created_at timestamptz not null
);
