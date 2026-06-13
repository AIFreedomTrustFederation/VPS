import { NextResponse } from 'next/server';
import { listAppProfiles, listAppSources, listBuildRuns, listDependencyIssues, listLearningEvents, listProviderNodeUpdates, listWorkloads } from '@/../packages/aift-engine-core/src/engine';

export async function GET() {
  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    collections: {
      app_sources: listAppSources(),
      app_profiles: listAppProfiles(),
      build_runs: listBuildRuns(),
      workloads: listWorkloads(),
      provider_node_updates: listProviderNodeUpdates(),
      dependency_issues: listDependencyIssues(),
      learning_events: listLearningEvents(),
    },
  });
}
