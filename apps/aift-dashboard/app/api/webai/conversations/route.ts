import { NextResponse } from 'next/server';
import { listConversations } from '@/lib/webai/conversations';

export async function GET() {
  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    conversations: listConversations(),
  });
}
