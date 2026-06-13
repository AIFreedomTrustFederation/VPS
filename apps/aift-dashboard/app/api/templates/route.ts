import { NextResponse } from 'next/server';
import { getTemplateRegistryPath, readTemplates } from '@/lib/templates';

export async function GET() {
  const templates = await readTemplates();
  return NextResponse.json({ ok: true, path: getTemplateRegistryPath(), templates });
}
