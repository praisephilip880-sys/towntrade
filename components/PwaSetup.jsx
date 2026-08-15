'use client';

import { useEffect } from 'react';

/** Registers the service worker (needed for background push + installability). */
export default function PwaSetup() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline/dev — harmless */ });
  }, []);
  return null;
}
