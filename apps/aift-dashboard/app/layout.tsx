import './globals.css';
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
            <a href="/apps">Apps</a>
            <a href="/templates">Templates</a>
            <a href="/builds">Builds</a>
            <a href="/deployments">Deployments</a>
            <a href="/nodes">Nodes</a>
            <a href="/health">Health</a>
            <a href="/settings">Settings</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
