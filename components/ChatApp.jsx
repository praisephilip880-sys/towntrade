'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice, formatTime, initials, timeAgo } from '@/lib/format';
import { BOT_USER_ID, SAFETY_BOT_NAME } from '@/lib/safety';
import { useToast } from './Toaster';
import VerifiedBadge from './VerifiedBadge';
import { IconArrowRight, IconChat, IconSend, IconShield } from './icons';

export default function ChatApp({
  currentUserId,
  initialChats,
  initialChatId,
  initialListingId,
  initialSellerId,
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [chats, setChats] = useState(initialChats);
  const [activeId, setActiveId] = useState(initialChatId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const active = chats.find((c) => c.id === activeId) ?? null;

  /* ------------------------- get-or-create chat ------------------------- */
  useEffect(() => {
    if (!initialListingId || !initialSellerId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: initialListingId, sellerId: initialSellerId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 401) return router.push('/#auth');
          toast(data.error || 'Could not start a chat.', 'error');
          return;
        }
        setChats((prev) => {
          const exists = prev.some((c) => c.id === data.chat.id);
          return exists ? prev : [data.chat, ...prev];
        });
        setActiveId(data.chat.id);
        router.replace(`/chat?chat=${data.chat.id}`, { scroll: false });
      } catch {
        toast('Network error. Please try again.', 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialListingId, initialSellerId]);

  /* ------------------------------- polling ------------------------------ */
  const refreshChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setChats((prev) => {
        const next = data.chats;
        const same =
          next.length === prev.length &&
          next.every((c, i) => c.id === prev[i]?.id && c.lastMessage === prev[i]?.lastMessage);
        return same ? prev : next;
      });
    } catch {
      /* silent — transient network issues shouldn't break the UI */
    }
  }, []);

  const refreshMessages = useCallback(async (chatId) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setMessages((prev) => {
        const next = data.messages;
        const same = next.length === prev.length && next.every((m, i) => m.id === prev[i]?.id);
        return same ? prev : next;
      });
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setLoadingThread(true);
    refreshMessages(activeId).finally(() => setLoadingThread(false));
    const t = setInterval(() => refreshMessages(activeId), 3000);
    return () => clearInterval(t);
  }, [activeId, refreshMessages]);

  useEffect(() => {
    const t = setInterval(refreshChats, 5000);
    return () => clearInterval(t);
  }, [refreshChats]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, activeId]);

  /* ------------------------------- sending ------------------------------ */
  const send = async (e) => {
    e?.preventDefault();
    const content = input.trim();
    if (!content || !activeId || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await fetch(`/api/chats/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) return router.push('/#auth');
        toast(data.error || 'Could not send message.', 'error');
        setInput(content);
        return;
      }
      if (data.blocked) {
        // Safety Bot intercepted the message.
        setMessages((prev) => [...prev, data.botMessage]);
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? { ...c, lastMessage: data.botMessage.content, lastMessageAt: data.botMessage.createdAt }
              : c,
          ),
        );
        toast(data.message || 'Your message was blocked by the Safety Bot.', 'warning');
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() } : c,
        ),
      );
    } catch {
      toast('Network error. Please try again.', 'error');
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  /* ------------------------------- helpers ------------------------------ */
  const renderMessage = (m) => {
    if (m.senderId === BOT_USER_ID) {
      return (
        <div key={m.id} className="flex justify-center">
          <div className="max-w-[92%] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-amber-700">
              <IconShield className="h-4 w-4" />
              {SAFETY_BOT_NAME}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-charcoal-800">
              {m.content}
            </p>
            <p className="mt-1.5 text-[10px] font-medium text-charcoal-400">{formatTime(m.createdAt)}</p>
          </div>
        </div>
      );
    }
    const mine = m.senderId === currentUserId;
    return (
      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${
            mine
              ? 'rounded-br-md bg-emerald-600 text-white'
              : 'rounded-bl-md border border-charcoal-100 bg-white text-charcoal-800'
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</p>
          <p className={`mt-1 text-[10px] font-medium ${mine ? 'text-emerald-100/80' : 'text-charcoal-400'}`}>
            {formatTime(m.createdAt)}
          </p>
        </div>
      </div>
    );
  };

  /* -------------------------------- render ------------------------------ */
  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-soft sm:h-[calc(100vh-8rem)]">
      <div className="flex h-full">
        {/* Conversation list */}
        <aside className={`w-full flex-col border-r border-charcoal-100 md:flex md:w-80 lg:w-96 ${activeId ? 'hidden' : 'flex'}`}>
          <div className="flex items-center justify-between border-b border-charcoal-100 px-5 py-4">
            <div>
              <h2 className="text-base font-extrabold text-charcoal-950">Messages</h2>
              <p className="text-xs text-charcoal-400">Private chats with your neighbors</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <IconChat className="h-7 w-7" />
                </span>
                <p className="text-sm font-semibold text-charcoal-800">No conversations yet</p>
                <p className="text-xs leading-relaxed text-charcoal-400">
                  Hit “Message Seller” on any listing to start chatting.
                </p>
                <Link
                  href="/marketplace"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500"
                >
                  Browse Marketplace <IconArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
            {chats.map((c) => {
              const isActive = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveId(c.id);
                    router.replace(`/chat?chat=${c.id}`, { scroll: false });
                  }}
                  className={`flex w-full items-center gap-3 border-b border-charcoal-50 px-4 py-3.5 text-left transition ${
                    isActive ? 'bg-emerald-50/70' : 'hover:bg-charcoal-50/60'
                  }`}
                >
                  <span className="relative shrink-0">
                    {c.listingImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.listingImage} alt="" className="h-11 w-11 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-lg">🏷️</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-bold text-charcoal-950">{c.otherName}</span>
                      {c.lastMessageAt && (
                        <span className="shrink-0 text-[10px] font-medium text-charcoal-400">{timeAgo(c.lastMessageAt)}</span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-charcoal-500">
                      {c.lastMessage ?? <span className="italic text-charcoal-300">Say hello about “{c.listingTitle}”</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] font-medium text-emerald-600">
                      {c.listingTitle} · {formatPrice(c.listingPrice)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Thread */}
        <section className={`min-w-0 flex-1 flex-col md:flex ${activeId ? 'flex' : 'hidden'}`}>
          {!active ? (
            <div className="hidden h-full flex-col items-center justify-center gap-3 p-8 text-center md:flex">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-charcoal-50 text-charcoal-300">
                <IconChat className="h-8 w-8" />
              </span>
              <p className="text-sm font-semibold text-charcoal-800">Select a conversation</p>
              <p className="max-w-xs text-xs leading-relaxed text-charcoal-400">
                Pick a chat on the left, or start a new one from any marketplace listing. The Safety Bot watches every
                conversation automatically.
              </p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 border-b border-charcoal-100 px-4 py-3">
                <button
                  onClick={() => setActiveId(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-charcoal-500 transition hover:bg-charcoal-50 md:hidden"
                  aria-label="Back to conversations"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5">
                    <path d="M19 12H5m6 6-6-6 6-6" />
                  </svg>
                </button>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-sm font-bold text-white">
                  {initials(active.otherName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-charcoal-950">
                    {active.otherName}
                    {active.otherVerified && <VerifiedBadge />}
                  </p>
                  <p className="truncate text-xs text-charcoal-400">
                    {active.otherNeighborhood} · chatting about{' '}
                    <Link href={`/listing/${active.listingId}`} className="font-semibold text-emerald-600 hover:text-emerald-500">
                      {active.listingTitle}
                    </Link>
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-charcoal-50/40 px-4 py-5">
                {loadingThread && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <span className="h-6 w-6 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin-slow" />
                  </div>
                ) : (
                  messages.map(renderMessage)
                )}
                <div ref={endRef} />
              </div>

              {/* Composer */}
              <form onSubmit={send} className="flex items-center gap-2 border-t border-charcoal-100 bg-white px-4 py-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Message ${active.otherName}…`}
                  maxLength={2000}
                  className="flex-1 rounded-full border border-charcoal-200 bg-charcoal-50/60 px-4 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  aria-label="Send message"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95 disabled:opacity-40"
                >
                  <IconSend className="h-5 w-5" />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
