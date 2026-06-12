import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="shell">
      <section className="hero-card">
        <p className="eyebrow">AI Freedom Trust VPS</p>
        <h1>App foundry online.</h1>
        <p className="lead">
          Built from GitHub. Deployed from a phone. Rebuilt like Vercel on our own open-source VPS platform.
        </p>
        <div className="status-grid">
          <div>
            <span>Source</span>
            <strong>GitHub</strong>
          </div>
          <div>
            <span>Build</span>
            <strong>VPS</strong>
          </div>
          <div>
            <span>Deploy</span>
            <strong>Docker</strong>
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
