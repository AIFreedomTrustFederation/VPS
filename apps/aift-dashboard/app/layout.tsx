import './globals.css';
import './webai/webai-mobile.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AIFT Cloud App Foundry',
  description: 'Mobile-first decentralized cloud app foundry dashboard.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a className="brand" href="/">AIFT Cloud</a>
          <nav className="nav-scroll">
            <a href="/domains">Domains</a>
            <a href="/sites">Sites</a>
            <a href="/sync">Sync</a>
            <a href="/controls">Controls</a>
            <a href="/webai">WebAI</a>
            <a href="/app-profiles">Profiles</a>
            <a href="/source-links">Sources</a>
            <a href="/logs">Logs</a>
            <a href="/readiness">Readiness</a>
            <a href="/apps">Apps</a>
            <a href="/templates">Templates</a>
            <a href="/builds">Builds</a>
            <a href="/deployments">Deployments</a>
            <a href="/nodes">Nodes</a>
            <a href="/discovered-nodes">Discovery</a>
            <a href="/shell">Shell</a>
            <a href="/health">Health</a>
            <a href="/connect-node">Node</a>
            <a href="/settings">Settings</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
