'use client';

import { useState } from 'react';

const nav = [
  ['Profiles', '/app-profiles'],
  ['WebAI', '/webai'],
  ['Readiness', '/readiness'],
  ['Logs', '/logs'],
  ['Nodes', '/nodes'],
  ['Health', '/health'],
  ['Settings', '/settings'],
];

export function TopMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="global-menu">
      <button className="menu-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-label="Open menu">☰</button>
      {open && (
        <div className="menu-panel">
          <div className="menu-head">
            <strong>AIFT controls</strong>
            <button type="button" onClick={() => setOpen(false)}>Close</button>
          </div>
          <div id="node-update-slot" />
          <div className="menu-links">
            {nav.map(([label, href]) => <a href={href} key={href}>{label}</a>)}
          </div>
        </div>
      )}
    </div>
  );
}
