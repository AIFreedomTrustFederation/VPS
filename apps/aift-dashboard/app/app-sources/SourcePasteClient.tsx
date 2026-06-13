'use client';

import { FormEvent, useEffect, useState } from 'react';

type Source = {
  id: string;
  label: string;
  repo: string;
  status: string;
};

export function SourcePasteClient() {
  const [url, setUrl] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [notice, setNotice] = useState('');

  async function loadSources() {
    const response = await fetch('/api/app-sources', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    setSources(data.sources ?? []);
  }

  useEffect(() => {
    loadSources();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = url.trim();
    if (!value) return;

    const response = await fetch('/api/app-sources', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: value }),
    });

    const data = await response.json();
    if (!response.ok) {
      setNotice(data.error || 'Could not save source.');
      return;
    }

    setUrl('');
    setSources(data.sources ?? []);
    setNotice(data.created ? 'Source saved.' : 'Source already saved.');
  }

  return (
    <section className="panel-card">
      <h2>Add app source</h2>
      <form onSubmit={submit} className="stack-list">
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/owner/repo" />
        <button type="submit">Save source</button>
      </form>
      {notice && <p className="muted">{notice}</p>}

      <h2>Saved sources</h2>
      <div className="stack-list">
        {sources.length === 0 ? (
          <div className="row-card"><strong>0</strong><span>No saved sources yet.</span></div>
        ) : sources.map((source) => (
          <div className="row-card" key={source.id}>
            <strong>{source.status}</strong>
            <span>{source.repo}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
