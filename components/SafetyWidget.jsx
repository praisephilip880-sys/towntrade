'use client';

import { useEffect, useRef, useState } from 'react';
import { CHATBOT_WELCOME, ASSISTANT_NAME } from '@/lib/chatbot';
import { FAQ, SAFETY_BOT_NAME } from '@/lib/safety';
import { whatsappLink } from '@/lib/constants';
import { formatTime } from '@/lib/format';
import { IconChat, IconShield, IconX } from './icons';

/**
 * TownTrade AI Assistant (chatbot): answers questions through the /api/chatbot
 * endpoint (real LLM when a key is configured, smart local engine otherwise),
 * watches for scam/sensitive content, and escalates to the owner's WhatsApp
 * DM when it cannot answer.
 */
export default function SafetyWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 'welcome', senderId: 0, content: CHATBOT_WELCOME, createdAt: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [status, setStatus] = useState(null);
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
  }, [messages, typing, open]);

  const push = (senderId, content, extra = {}) =>
    setMessages((prev) => [...prev, { id: nextId(), senderId, content, createdAt: new Date().toISOString(), ...extra }]);

  const ask = async (e) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q || typing) return;
    setInput('');
    push('me', q);

    // Ask the AI endpoint; fall back to the local engine on any error.
    let answer = null;
    let escalate = false;
    setTyping(true);
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      if (res.ok) {
        const data = await res.json();
        answer = data.answer;
        escalate = data.escalate === true;
      }
    } catch { /* fall through */ }
    if (!answer) {
      const { chatbotReply } = await import('@/lib/chatbot');
      const local = chatbotReply(q);
      answer = local.answer;
      escalate = local.escalate;
    }
    setTyping(false);
    push(0, answer, escalate ? { escalate: true } : {});
  };

  const quick = (f) => {
    push('me', f.q);
    push(0, f.answer);
  };

  const waHref = whatsappLink('Hi TownTrade Support! I asked the AI Assistant on the site and it could not help with this, so I am reaching out directly. My question: ');

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open TownTrade AI Assistant"
        className={`fixed bottom-5 right-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full shadow-lift transition hover:scale-105 active:scale-95 ${
          open ? 'bg-charcoal-950 text-white' : 'bg-emerald-600 text-white shadow-emerald'
        }`}
      >
        {open ? <IconX className="h-6 w-6" /> : <IconChat className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500" />
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[80] flex h-[32rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-charcoal-100 bg-white shadow-lift animate-pop-in">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-charcoal-100 bg-gradient-to-r from-emerald-700 to-emerald-500 px-4 py-3.5 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <IconShield className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold">{ASSISTANT_NAME}</p>
              <p className="text-[11px] text-emerald-50/90">AI helper · scam guard · WhatsApp handoff</p>
            </div>
            <span className="ml-auto flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[10px] font-bold">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Online
            </span>
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
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-emerald-600 px-3.5 py-2 text-sm leading-relaxed text-white">{m.content}</div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-charcoal-100 bg-white px-3.5 py-2.5 shadow-sm">
                    <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-emerald-600">
                      <IconShield className="h-3 w-3" /> {SAFETY_BOT_NAME}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-charcoal-800">{m.content}</p>
                    <p className="mt-1 text-[10px] text-charcoal-400">{formatTime(m.createdAt)}</p>
                    {m.escalate && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white transition hover:brightness-95 active:scale-95"
                      >
                        💬 Chat with Support on WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              ),
            )}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-charcoal-100 bg-white px-4 py-3 shadow-sm">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick questions */}
          <div className="flex gap-1.5 overflow-x-auto border-t border-charcoal-100 bg-white px-3 py-2">
            {FAQ.map((f) => (
              <button
                key={f.q}
                onClick={() => quick(f)}
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
              placeholder="Ask about buying, OPay, refunds, safety…"
              maxLength={200}
              className="flex-1 rounded-full border border-charcoal-200 bg-charcoal-50/60 px-4 py-2 text-sm text-charcoal-900 placeholder:text-charcoal-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              aria-label="Send message"
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
