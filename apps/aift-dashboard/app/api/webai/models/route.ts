import { NextResponse } from 'next/server';
import { getDefaultWebAIModel, webAIModels } from '@/lib/webai/models';

export async function GET() {
  return NextResponse.json({
    ok: true,
    default_model: getDefaultWebAIModel(),
    models: webAIModels,
  });
}
