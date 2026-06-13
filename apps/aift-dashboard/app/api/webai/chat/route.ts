import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { appendMessage, createConversation, readConversation } from '@/lib/webai/conversations';
import { findWebAIModel } from '@/lib/webai/models';
import { createWebAIReply, type WebAIContext } from '@/lib/webai/responder';

async function loadContext(): Promise<WebAIContext | null> {
  try {
    const headerStore = await headers();
    const host = headerStore.get('host') || '127.0.0.1:3000';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const response = await fetch(`${protocol}://${host}/api/webai/context`, { cache: 'no-store' });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const requestedConversationId = typeof body.conversation_id === 'string' ? body.conversation_id : '';
  const selectedModel = findWebAIModel(typeof body.model_id === 'string' ? body.model_id : undefined);

  if (!message) {
    return NextResponse.json({ ok: false, error: 'Message is required.' }, { status: 400 });
  }

  let conversation = requestedConversationId ? readConversation(requestedConversationId) : null;
  if (!conversation) {
    conversation = createConversation(message);
  }

  appendMessage(conversation, 'user', `[model:${selectedModel.id}] ${message}`);

  const context = await loadContext();
  const reply = [
    `Selected model: ${selectedModel.label} (${selectedModel.status})`,
    '',
    createWebAIReply(message, context),
  ].join('\n');
  appendMessage(conversation, 'assistant', reply);

  const saved = readConversation(conversation.id) ?? conversation;

  return NextResponse.json({
    ok: true,
    model: selectedModel,
    conversation: saved,
  });
}
