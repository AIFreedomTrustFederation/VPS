'use client';

import { FormEvent, useEffect, useState } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
};

type ConversationSummary = {
  id: string;
  title: string;
  message_count: number;
};

type WebAIContext = {
  summary: {
    repo_files_found: number;
    aift_home_count: number;
    heartbeat_file_count: number;
    node_card_file_count: number;
  };
  recommended_next_step: string;
};

export function WebAIChatClient() {
  const [text, setText] = useState('');
  const [active, setActive] = useState<Conversation | null>(null);
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const [context, setContext] = useState<WebAIContext | null>(null);
  const [sending, setSending] = useState(false);

  async function loadHistory() {
    const response = await fetch('/api/webai/conversations', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    setHistory(data.conversations ?? []);
  }

  async function loadContext() {
    const response = await fetch('/api/webai/context', { cache: 'no-store' });
    if (!response.ok) return;
    setContext(await response.json());
  }

  useEffect(() => {
    loadHistory();
    loadContext();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message || sending) return;

    setSending(true);
    setText('');

    const response = await fetch('/api/webai/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, conversation_id: active?.id }),
    });

    if (response.ok) {
      const data = await response.json();
      setActive(data.conversation);
      await loadHistory();
      await loadContext();
    }

    setSending(false);
  }

  return (
    <div className="grid two">
      <aside className="panel-card">
        <div className="row-card">
          <strong>+</strong>
          <button type="button" onClick={() => setActive(null)}>New chat</button>
        </div>

        <h2>Chat history</h2>
        <div className="stack-list">
          {history.length === 0 ? (
            <div className="row-card"><strong>0</strong><span>No saved chats yet.</span></div>
          ) : history.map((item) => (
            <div className="row-card" key={item.id}>
              <strong>{item.message_count}</strong>
              <span>{item.title}</span>
            </div>
          ))}
        </div>

        <h2>Context</h2>
        <div className="stack-list">
          <div className="row-card"><strong>{context?.summary.repo_files_found ?? 0}</strong><span>Repo files</span></div>
          <div className="row-card"><strong>{context?.summary.aift_home_count ?? 0}</strong><span>Runtime folders</span></div>
          <div className="row-card"><strong>{context?.summary.heartbeat_file_count ?? 0}</strong><span>Heartbeats</span></div>
          <div className="row-card"><strong>{context?.summary.node_card_file_count ?? 0}</strong><span>Node cards</span></div>
        </div>
      </aside>

      <section className="panel-card">
        <h2>{active?.title ?? 'Current conversation'}</h2>
        <p className="muted">Ask WebAI about repo files, node status, heartbeats, node cards, app building, or the next step.</p>

        <div className="stack-list">
          {(active?.messages ?? []).length === 0 ? (
            <div className="row-card"><strong>WebAI</strong><span>Ready for a real local AIFT VPS conversation.</span></div>
          ) : active!.messages.map((item) => (
            <div className="row-card" key={item.id}>
              <strong>{item.role === 'user' ? 'You' : 'WebAI'}</strong>
              <span style={{ whiteSpace: 'pre-wrap' }}>{item.content}</span>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="panel-card" style={{ marginTop: '1rem' }}>
          <label htmlFor="webai-message">Message WebAI</label>
          <textarea
            id="webai-message"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Ask what is running, what exists, or what to build next..."
            rows={4}
          />
          <button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send'}</button>
        </form>

        <div className="row-card"><strong>Next</strong><span>{context?.recommended_next_step ?? 'Load WebAI context.'}</span></div>
      </section>
    </div>
  );
}
