import { type WebAIContext } from './responder';

type LocalRuntimeResult = {
  ok: boolean;
  reply: string;
  runtime_url: string;
  model_name: string;
  runtime_type: string;
  error?: string;
};

function getRuntimeConfig() {
  return {
    runtimeUrl: process.env.WEBAI_LOCAL_MODEL_URL || 'http://127.0.0.1:11434',
    modelName: process.env.WEBAI_LOCAL_MODEL_NAME || 'llama3.2',
    runtimeType: process.env.WEBAI_LOCAL_MODEL_RUNTIME || 'ollama',
  };
}

function buildContextBlock(context: WebAIContext | null) {
  if (!context) return 'No AIFT VPS context is loaded yet.';

  return [
    'AIFT VPS real context:',
    `Repo context files found: ${context.summary.repo_files_found}`,
    `Repo context files missing: ${context.summary.repo_files_missing}`,
    `Local runtime folders: ${context.summary.aift_home_count}`,
    `Heartbeat files: ${context.summary.heartbeat_file_count}`,
    `Node card files: ${context.summary.node_card_file_count}`,
    `Recommended next step: ${context.recommended_next_step}`,
  ].join('\n');
}

async function callOllama(message: string, context: WebAIContext | null): Promise<LocalRuntimeResult> {
  const { runtimeUrl, modelName, runtimeType } = getRuntimeConfig();
  const prompt = [
    'You are WebAI inside AIFT VPS.',
    'Use the provided real context. Do not invent projects, nodes, builds, releases, or deployment records.',
    'If data is missing, say what is missing and give the next setup step.',
    '',
    buildContextBlock(context),
    '',
    `User message: ${message}`,
  ].join('\n');

  try {
    const response = await fetch(`${runtimeUrl.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        reply: '',
        runtime_url: runtimeUrl,
        model_name: modelName,
        runtime_type: runtimeType,
        error: `Local runtime returned HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      reply: typeof data.response === 'string' ? data.response : JSON.stringify(data),
      runtime_url: runtimeUrl,
      model_name: modelName,
      runtime_type: runtimeType,
    };
  } catch (error) {
    return {
      ok: false,
      reply: '',
      runtime_url: runtimeUrl,
      model_name: modelName,
      runtime_type: runtimeType,
      error: error instanceof Error ? error.message : 'Unknown local runtime error',
    };
  }
}

export async function callLocalOpenModel(message: string, context: WebAIContext | null): Promise<LocalRuntimeResult> {
  const { runtimeType, runtimeUrl, modelName } = getRuntimeConfig();

  if (runtimeType === 'ollama') {
    return callOllama(message, context);
  }

  return {
    ok: false,
    reply: '',
    runtime_url: runtimeUrl,
    model_name: modelName,
    runtime_type: runtimeType,
    error: `Runtime type ${runtimeType} is not wired yet.`,
  };
}
