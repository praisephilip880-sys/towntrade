'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { timeAgo } from '@/lib/format';
import { useToast } from './Toaster';

const TYPE_ICON = {
  payment: '💸',
  payout: '🏦',
  refund: '↩️',
  safety: '🛡️',
  info: '🔔',
};

/**
 * Notification bell: polls the API, shows an unread badge, and surfaces browser
 * notifications on any modern browser while the site is open.
 */
export default function NotificationBell({ user }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  // Initialize to a constant so SSR and hydration render identically; the real
  // permission is read in a useEffect once the browser is available.
  const [perm, setPerm] = useState('default');
  const seenRef = useRef(new Set());
  const boxRef = useRef(null);

  const load = async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const list = data.notifications ?? [];
      setItems(list);
      setUnread(data.unreadCount ?? 0);

      // Browser notification for brand-new items (only when permitted).
      if (perm === 'granted' && 'Notification' in window) {
        for (const n of list) {
          if (!n.read && !seenRef.current.has(n.id)) {
            seenRef.current.add(n.id);
            try {
              new Notification(n.title, { body: n.body || '', tag: `tt-${n.id}` });
            } catch { /* some browsers reject new Notification() without a service worker */ }
          }
        }
      }
    } catch { /* offline — silently ignore */ }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) setPerm(Notification.permission);
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the dropdown on outside click / route change.
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const enable = async () => {
    if (!('Notification' in window)) {
      toast('This browser does not support notifications.', 'info');
      return;
    }
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === 'granted') {
      toast('Notifications enabled — you will hear about payments and payouts! 🔔');
      try {
        await fetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationsEnabled: true }),
        });
        router.refresh();
      } catch { /* non-fatal */ }
    }
  };

  const markRead = async (id) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: 1 } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch { /* ignore */ }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-charcoal-600 transition hover:bg-charcoal-50 hover:text-charcoal-950"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-black text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-lift animate-pop-in">
          <div className="flex items-center justify-between border-b border-charcoal-100 px-4 py-3">
            <p className="text-sm font-extrabold text-charcoal-950">Notifications</p>
            {unread > 0 && (
              <button
                onClick={async () => {
                  await fetch('/api/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ all: true }),
                  });
                  setItems((prev) => prev.map((n) => ({ ...n, read: 1 })));
                  setUnread(0);
                }}
                className="text-xs font-bold text-emerald-600 transition hover:text-emerald-500"
              >
                Mark all read
              </button>
            )}
          </div>

          {perm === 'default' && (
            <button
              onClick={enable}
              className="flex w-full items-center gap-2.5 border-b border-charcoal-100 bg-emerald-50/70 px-4 py-3 text-left transition hover:bg-emerald-50"
            >
              <span className="text-lg">🔔</span>
              <span className="text-xs font-bold text-emerald-800">
                Turn on browser notifications
                <span className="block font-medium text-emerald-700/70">Never miss a payment or payout update — works in any browser.</span>
              </span>
            </button>
          )}

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-charcoal-400">No notifications yet.</p>
            )}
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.link || '/profile'}
                onClick={() => !n.read && markRead(n.id)}
                className={`flex items-start gap-3 border-b border-charcoal-50 px-4 py-3 transition last:border-0 hover:bg-charcoal-50/60 ${n.read ? '' : 'bg-emerald-50/30'}`}
              >
                <span className="mt-0.5 text-lg">{TYPE_ICON[n.type] ?? '🔔'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-charcoal-900">{n.title}</span>
                  {n.body && <span className="mt-0.5 block text-xs leading-relaxed text-charcoal-500">{n.body}</span>}
                  <span className="mt-1 block text-[10px] font-semibold text-charcoal-400">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
