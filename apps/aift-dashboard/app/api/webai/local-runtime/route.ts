import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    runtime: {
      url: process.env.WEBAI_LOCAL_MODEL_URL || 'http://127.0.0.1:11434',
      model: process.env.WEBAI_LOCAL_MODEL_NAME || 'llama3.2',
      type: process.env.WEBAI_LOCAL_MODEL_RUNTIME || 'ollama',
    },
    status: 'configured',
    note: 'Local open model runtime configuration is present. Runtime reachability check will be added after local node testing.',
  });
}
