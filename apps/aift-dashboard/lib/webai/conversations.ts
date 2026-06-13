import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import crypto from 'crypto';

export type WebAIMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
};

export type WebAIConversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: WebAIMessage[];
};

function safeId(prefix: string) {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

export function getAiftHome() {
  return process.env.AIFT_HOME || path.join(homedir(), '.aift-webai');
}

export function getWebAIHome() {
  return path.join(getAiftHome(), 'webai');
}

export function getConversationsDir() {
  return path.join(getWebAIHome(), 'conversations');
}

export function ensureWebAIStorage() {
  mkdirSync(getConversationsDir(), { recursive: true });
}

function conversationPath(conversationId: string) {
  return path.join(getConversationsDir(), `${conversationId}.json`);
}

export function listConversations() {
  ensureWebAIStorage();

  return readdirSync(getConversationsDir())
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const fullPath = path.join(getConversationsDir(), file);
      try {
        const raw = readFileSync(fullPath, 'utf8');
        const conversation = JSON.parse(raw) as WebAIConversation;
        return {
          id: conversation.id,
          title: conversation.title,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
          message_count: conversation.messages.length,
        };
      } catch {
        const stat = statSync(fullPath);
        return {
          id: file.replace(/\.json$/, ''),
          title: file.replace(/\.json$/, ''),
          created_at: stat.birthtime.toISOString(),
          updated_at: stat.mtime.toISOString(),
          message_count: 0,
        };
      }
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function readConversation(conversationId: string): WebAIConversation | null {
  ensureWebAIStorage();
  const filePath = conversationPath(conversationId);
  if (!existsSync(filePath)) return null;

  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as WebAIConversation;
  } catch {
    return null;
  }
}

export function createConversation(initialMessage: string) {
  ensureWebAIStorage();
  const now = new Date().toISOString();
  const title = initialMessage.trim().slice(0, 64) || 'New WebAI chat';
  const conversation: WebAIConversation = {
    id: safeId('webai'),
    title,
    created_at: now,
    updated_at: now,
    messages: [],
  };

  writeConversation(conversation);
  return conversation;
}

export function writeConversation(conversation: WebAIConversation) {
  ensureWebAIStorage();
  writeFileSync(conversationPath(conversation.id), JSON.stringify(conversation, null, 2));
}

export function appendMessage(conversation: WebAIConversation, role: WebAIMessage['role'], content: string) {
  const now = new Date().toISOString();
  conversation.messages.push({
    id: safeId('msg'),
    role,
    content,
    created_at: now,
  });
  conversation.updated_at = now;
  writeConversation(conversation);
  return conversation;
}
