'use client';

import { FormEvent, useState } from 'react';

export function LoginClient() {
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok || !data.ok) {
      setMessage(data.error || 'Sign-in failed.');
      return;
    }
    setToken('');
    const next = new URLSearchParams(window.location.search).get('next');
    window.location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  }

  async function signOut() {
    await fetch('/api/session', { method: 'DELETE' });
    setMessage('Signed out.');
  }

  return (
    <form onSubmit={signIn} className="card metric" style={{ display: 'grid', gap: '1rem', maxWidth: 480 }}>
      <label style={{ display: 'grid', gap: '.5rem' }}>
        <span>Dashboard token (AIFT_DASHBOARD_TOKEN)</span>
        <input type="password" autoComplete="current-password" value={token} onChange={(event) => setToken(event.target.value)} required />
      </label>
      <div className="toolbar">
        <button className="btn" type="submit" disabled={busy || !token}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <button className="btn secondary" type="button" onClick={signOut}>Sign out</button>
      </div>
      {message ? <p>{message}</p> : null}
    </form>
  );
}
