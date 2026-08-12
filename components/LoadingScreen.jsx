'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Logo from './Logo';

/**
 * Branded loading overlay: a shield "TT" logo with a pulsing ring, shown on
 * the first paint and whenever the user navigates between routes.
 */
export default function LoadingScreen() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(true);
  const [show, setShow] = useState(true);

  // Initial load: keep the splash visible briefly, then fade it out.
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 650);
    return () => clearTimeout(t);
  }, []);

  // Route transitions: re-show the loader whenever the URL changes.
  useEffect(() => {
    if (!show) {
      setShow(true);
    }
    const hide = setTimeout(() => setVisible(false), 350);
    return () => clearTimeout(hide);
  }, [pathname, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShow(false), 750);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!show) return null;
  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-white transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-label="Loading TownTrade"
      role="status"
    >
      <div className="relative">
        <span className="absolute -inset-4 animate-ping rounded-3xl bg-emerald-200/50" />
        <span className="relative block animate-float">
          <Logo size="lg" withWordmark={false} className="scale-110" />
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm font-bold text-charcoal-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        Loading your neighborhood…
      </div>
    </div>
  );
}
