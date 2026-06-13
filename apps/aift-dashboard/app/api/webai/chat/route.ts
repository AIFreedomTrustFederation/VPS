import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { addAppSource } from '@/lib/app-sources';
import { appendMessage, createConversation, readConversation } from '@/lib/webai/conversations';
import { callLocalOpenModel } from '@/lib/webai/local-runtime';
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

async function buildReply(modelId: string, message: string, context: WebAIContext | null) {
  const selectedModel = findWebAIModel(modelId);
  const sourceResult = addAppSource(message);

  if (sourceResult.ok) {
    return {
      model: selectedModel,
      reply: [
        sourceResult.created ? 'Saved app source.' : 'App source already saved.',
        `Source: ${sourceResult.source.repo}`,
        `Analysis path: /api/app-sources/${sourceResult.source.id}`,
      ].join('\n'),
    };
  }

  if (selectedModel.id === 'local-open-model') {
    const result = await callLocalOpenModel(message, context);
    if (result.ok) {
      return {
        model: selectedModel,
        reply: [
          `Selected model: ${selectedModel.label}`,
          `Runtime: ${result.runtime_type}`,
          `Model: ${result.model_name}`,
          '',
          result.reply,
        ].join('\n'),
      };
    }

    return {
      model: selectedModel,
      reply: [
        `Selected model: ${selectedModel.label}`,
        'Local open model runtime is not reachable yet.',
        `Runtime URL: ${result.runtime_url}`,
        `Model name: ${result.model_name}`,
        `Runtime type: ${result.runtime_type}`,
        result.error ? `Error: ${result.error}` : '',
        '',
        'Start a local open model runtime on this node, then send the message again.',
        '',
        createWebAIReply(message, context),
      ].filter(Boolean).join('\n'),
    };
  }

  return {
    model: selectedModel,
    reply: [
      `Selected model: ${selectedModel.label} (${selectedModel.status})`,
      '',
      createWebAIReply(message, context),
    ].join('\n'),
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const requestedConversationId = typeof body.conversation_id === 'string' ? body.conversation_id : '';
  const requestedModelId = typeof body.model_id === 'string' ? body.model_id : undefined;

  if (!message) {
    return NextResponse.json({ ok: false, error: 'Message is required.' }, { status: 400 });
  }

  let conversation = requestedConversationId ? readConversation(requestedConversationId) : null;
  if (!conversation) {
    conversation = createConversation(message);
  }

  const context = await loadContext();
  const { model, reply } = await buildReply(requestedModelId || '', message, context);

  appendMessage(conversation, 'user', `[model:${model.id}] ${message}`);
  appendMessage(conversation, 'assistant', reply);

  const saved = readConversation(conversation.id) ?? conversation;

  return NextResponse.json({
    ok: true,
    model,
    conversation: saved,
  });
}
