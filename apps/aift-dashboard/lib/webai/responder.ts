type SourceStatus = {
  id: string;
  label: string;
  path: string;
  exists: boolean;
};

type NodeContext = {
  aift_home: string;
  heartbeats: { file_count: number };
  node_cards: { file_count: number };
  logs: { file_count: number };
};

export type WebAIContext = {
  repo_context: SourceStatus[];
  node_context: NodeContext[];
  summary: {
    repo_files_found: number;
    repo_files_missing: number;
    aift_home_count: number;
    heartbeat_file_count: number;
    node_card_file_count: number;
  };
  recommended_next_step: string;
};

function hasTerm(message: string, terms: string[]) {
  const lower = message.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

export function createWebAIReply(message: string, context: WebAIContext | null) {
  if (!context) {
    return [
      'I could not load the real AIFT VPS context yet.',
      '',
      'Start the dashboard on a real node, then open /api/webai/context to confirm the context endpoint is reachable.',
    ].join('\n');
  }

  if (hasTerm(message, ['node', 'heartbeat', 'phone', 'runtime'])) {
    return [
      `I found ${context.summary.aift_home_count} local AIFT runtime folder(s).`,
      `I found ${context.summary.heartbeat_file_count} heartbeat file(s).`,
      `I found ${context.summary.node_card_file_count} node card file(s).`,
      '',
      context.node_context.length > 0
        ? `Active local context: ${context.node_context.map((node) => node.aift_home).join(', ')}`
        : 'No local AIFT runtime folders were found yet.',
      '',
      `Next step: ${context.recommended_next_step}`,
    ].join('\n');
  }

  if (hasTerm(message, ['repo', 'readme', 'docs', 'policy', 'files'])) {
    const missing = context.repo_context.filter((item) => !item.exists);
    return [
      `I found ${context.summary.repo_files_found} repo context file(s).`,
      `I found ${context.summary.repo_files_missing} missing repo context file(s).`,
      '',
      missing.length > 0
        ? `Missing: ${missing.map((item) => item.path).join(', ')}`
        : 'All tracked WebAI foundation files are present.',
      '',
      `Next step: ${context.recommended_next_step}`,
    ].join('\n');
  }

  if (hasTerm(message, ['build', 'app', 'project', 'no-code', 'nocode', 'template'])) {
    return [
      'For no-code app building, I will use only real connected repositories, real templates, and real node context.',
      '',
      'Current foundation status:',
      `- Repo context files found: ${context.summary.repo_files_found}`,
      `- Runtime folders found: ${context.summary.aift_home_count}`,
      `- Heartbeat files found: ${context.summary.heartbeat_file_count}`,
      '',
      'The next product step is to connect a real repository registry and project creation flow, then create apps from actual repo/template records instead of invented records.',
    ].join('\n');
  }

  if (hasTerm(message, ['next', 'focus', 'work on', 'priority'])) {
    return [
      'The next best step is WebAI v0.1: real chat, real context, and approved actions.',
      '',
      'Current real context:',
      `- Repo context files found: ${context.summary.repo_files_found}`,
      `- Runtime folders found: ${context.summary.aift_home_count}`,
      `- Heartbeat files found: ${context.summary.heartbeat_file_count}`,
      `- Node cards found: ${context.summary.node_card_file_count}`,
      '',
      `Recommended next step: ${context.recommended_next_step}`,
    ].join('\n');
  }

  return [
    'I am connected to the real AIFT VPS context layer.',
    '',
    'I can currently answer from repo files, local runtime folders, heartbeat files, node cards, and logs. I will not invent project, node, deployment, or build records.',
    '',
    `Repo context files found: ${context.summary.repo_files_found}`,
    `Local runtime folders found: ${context.summary.aift_home_count}`,
    `Heartbeat files found: ${context.summary.heartbeat_file_count}`,
    `Node cards found: ${context.summary.node_card_file_count}`,
    '',
    `Recommended next step: ${context.recommended_next_step}`,
  ].join('\n');
}
