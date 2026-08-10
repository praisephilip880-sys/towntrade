'use client';

import { useEffect, useRef, useState } from 'react';
import { answerQuestion, FAQ, SAFETY_BOT_NAME } from '@/lib/safety';
import { formatTime } from '@/lib/format';
import { IconChat, IconShield, IconX } from './icons';

const WELCOME = {
  id: 'welcome',
  senderId: 0,
  content:
    'Hi! I’m the TownTrade Safety Assistant. 🤖 I scan every message for card numbers, bank details, phone numbers, and off-platform payment requests — anything sensitive gets blocked and flagged. Ask me anything about staying safe.',
  createdAt: new Date().toISOString(),
};

export default function SafetyWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(null); // { ok, restricted, until, flags }
  const endRef = useRef(null);
  const idRef = useRef(100);
  const nextId = () => ++idRef.current;

  useEffect(() => {
    if (!open) return;
    fetch('/api/users/me', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          setStatus({ loggedOut: true });
          return;
        }
        const data = await res.json();
        const restricted =
          data.user?.sellingRestrictedUntil && new Date(data.user.sellingRestrictedUntil).getTime() > Date.now();
        setStatus({
          loggedOut: false,
          restricted: !!restricted,
          until: restricted ? data.user.sellingRestrictedUntil : null,
          flags: data.user?.safetyFlags ?? 0,
        });
      })
      .catch(() => setStatus({ loggedOut: true }));
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open]);

  const ask = (e) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q) return;
    const { answer } = answerQuestion(q);
    setMessages((prev) => [
      ...prev,
      { id: nextId(), senderId: 'me', content: q, createdAt: new Date().toISOString() },
      { id: nextId(), senderId: 0, content: answer, createdAt: new Date().toISOString() },
    ]);
    setInput('');
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Safety Assistant"
        className={`fixed bottom-5 right-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full shadow-lift transition hover:scale-105 active:scale-95 ${
          open ? 'bg-charcoal-950 text-white' : 'bg-emerald-600 text-white shadow-emerald'
        }`}
      >
        {open ? <IconX className="h-6 w-6" /> : <IconShield className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500" />
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[80] flex h-[28rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-charcoal-100 bg-white shadow-lift animate-pop-in">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-charcoal-100 bg-gradient-to-r from-emerald-700 to-emerald-500 px-4 py-3.5 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <IconShield className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold">{SAFETY_BOT_NAME}</p>
              <p className="text-[11px] text-emerald-50/90">Watching every conversation for scams</p>
            </div>
          </div>

          {/* Account status */}
          {status && (
            <div className="border-b border-charcoal-100 bg-charcoal-50/50 px-4 py-2.5 text-xs">
              {status.loggedOut ? (
                <p className="text-charcoal-500">
                  <span className="font-bold text-charcoal-700">Not signed in</span> — sign in to see your account status.
                </p>
              ) : status.restricted ? (
                <p className="font-semibold text-amber-700">
                  ⚠️ Selling paused until {new Date(status.until).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              ) : (
                <p className="text-charcoal-600">
                  <span className="font-bold text-emerald-700">✓ Account healthy</span>
                  {status.flags > 0 ? ` · ${status.flags} past flag${status.flags > 1 ? 's' : ''} on record` : ' · no safety flags'}
                </p>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 space-y-2.5 overflow-y-auto bg-charcoal-50/40 px-4 py-4">
            {messages.map((m) =>
              m.senderId === 'me' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-emerald-600 px-3.5 py-2 text-sm leading-relaxed text-white">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-charcoal-100 bg-white px-3.5 py-2.5 shadow-sm">
                    <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-emerald-600">
                      <IconShield className="h-3 w-3" /> Safety Assistant
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-charcoal-800">{m.content}</p>
                    <p className="mt-1 text-[10px] text-charcoal-400">{formatTime(m.createdAt)}</p>
                  </div>
                </div>
              ),
            )}
            <div ref={endRef} />
          </div>

          {/* Quick questions */}
          <div className="flex gap-1.5 overflow-x-auto border-t border-charcoal-100 bg-white px-3 py-2">
            {FAQ.map((f) => (
              <button
                key={f.q}
                onClick={() =>
                  setMessages((prev) => [
                    ...prev,
                    { id: nextId(), senderId: 'me', content: f.q, createdAt: new Date().toISOString() },
                    { id: nextId(), senderId: 0, content: f.answer, createdAt: new Date().toISOString() },
                  ])
                }
                className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
              >
                {f.q}
              </button>
            ))}
          </div>

          {/* Composer */}
          <form onSubmit={ask} className="flex items-center gap-2 border-t border-charcoal-100 bg-white px-3 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about safety or escrow…"
              maxLength={200}
              className="flex-1 rounded-full border border-charcoal-200 bg-charcoal-50/60 px-4 py-2 text-sm text-charcoal-900 placeholder:text-charcoal-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send question"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95 disabled:opacity-40"
            >
              <IconChat className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
