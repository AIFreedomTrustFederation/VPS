'use client';

import { useEffect } from 'react';

export function PwaInstallClient() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[AIFT Cloud] Service worker registration failed', error);
    });
  }, []);

  return null;
}
