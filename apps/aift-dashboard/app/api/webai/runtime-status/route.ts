import { NextResponse } from 'next/server';

export async function GET() {
  const runtime = {
    url: process.env.WEBAI_LOCAL_MODEL_URL || 'http://127.0.0.1:11434',
    model: process.env.WEBAI_LOCAL_MODEL_NAME || 'llama3.2',
    type: process.env.WEBAI_LOCAL_MODEL_RUNTIME || 'ollama',
  };

  try {
    const response = await fetch(runtime.url, { cache: 'no-store' });
    return NextResponse.json({
      ok: response.ok,
      runtime,
      status: response.ok ? 'available' : 'unreachable',
      http_status: response.status,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      runtime,
      status: 'unreachable',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
