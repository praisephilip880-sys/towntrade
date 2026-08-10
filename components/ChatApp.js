'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice, formatTime, initials, timeAgo } from '@/lib/format';
import { useToast } from './Toaster';
import VerifiedBadge from './VerifiedBadge';
import { IconArrowRight, IconChat, IconSend } from './icons';
export default function ChatApp({ currentUserId, initialChats, initialChatId, initialListingId, initialSellerId, }) {
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
        if (!initialListingId || !initialSellerId)
            return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/chats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ listingId: initialListingId, sellerId: initialSellerId }),
                });
                const data = await res.json();
                if (cancelled)
                    return;
                if (!res.ok) {
                    if (res.status === 401)
                        return router.push('/#auth');
                    toast(data.error || 'Could not start a chat.', 'error');
                    return;
                }
                setChats((prev) => {
                    const exists = prev.some((c) => c.id === data.chat.id);
                    return exists ? prev : [data.chat, ...prev];
                });
                setActiveId(data.chat.id);
                router.replace(`/chat?chat=${data.chat.id}`, { scroll: false });
            }
            catch {
                toast('Network error. Please try again.', 'error');
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialListingId, initialSellerId]);
    /* ------------------------------- polling ------------------------------ */
    const refreshChats = useCallback(async () => {
        try {
            const res = await fetch('/api/chats', { cache: 'no-store' });
            if (!res.ok)
                return;
            const data = await res.json();
            setChats((prev) => {
                const next = data.chats;
                const same = next.length === prev.length && next.every((c, i) => c.id === prev[i]?.id && c.lastMessage === prev[i]?.lastMessage);
                return same ? prev : next;
            });
        }
        catch {
            /* silent — transient network issues shouldn't break the UI */
        }
    }, []);
    const refreshMessages = useCallback(async (chatId) => {
        try {
            const res = await fetch(`/api/chats/${chatId}/messages`, { cache: 'no-store' });
            if (!res.ok)
                return;
            const data = await res.json();
            setMessages((prev) => {
                const next = data.messages;
                const same = next.length === prev.length && next.every((m, i) => m.id === prev[i]?.id);
                return same ? prev : next;
            });
        }
        catch {
            /* silent */
        }
    }, []);
    useEffect(() => {
        if (!activeId)
            return;
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
        if (!content || !activeId || sending)
            return;
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
                toast(data.error || 'Could not send message.', 'error');
                setInput(content);
                return;
            }
            setMessages((prev) => [...prev, data.message]);
            setChats((prev) => prev.map((c) => c.id === activeId ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() } : c));
        }
        catch {
            toast('Network error. Please try again.', 'error');
            setInput(content);
        }
        finally {
            setSending(false);
        }
    };
    /* -------------------------------- render ------------------------------ */
    return (_jsx("div", { className: "mx-auto flex h-[calc(100vh-9rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-soft sm:h-[calc(100vh-8rem)]", children: _jsxs("div", { className: "flex h-full", children: [_jsxs("aside", { className: `w-full flex-col border-r border-charcoal-100 md:flex md:w-80 lg:w-96 ${activeId ? 'hidden' : 'flex'}`, children: [_jsxs("div", { className: "border-b border-charcoal-100 px-5 py-4", children: [_jsx("h2", { className: "text-base font-extrabold text-charcoal-950", children: "Messages" }), _jsx("p", { className: "text-xs text-charcoal-400", children: "Private chats with your neighbors" })] }), _jsxs("div", { className: "flex-1 overflow-y-auto", children: [chats.length === 0 && (_jsxs("div", { className: "flex h-full flex-col items-center justify-center gap-3 p-8 text-center", children: [_jsx("span", { className: "flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600", children: _jsx(IconChat, { className: "h-7 w-7" }) }), _jsx("p", { className: "text-sm font-semibold text-charcoal-800", children: "No conversations yet" }), _jsx("p", { className: "text-xs leading-relaxed text-charcoal-400", children: "Hit \u201CMessage Seller\u201D on any listing to start chatting." }), _jsxs(Link, { href: "/marketplace", className: "mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500", children: ["Browse Marketplace ", _jsx(IconArrowRight, { className: "h-3.5 w-3.5" })] })] })), chats.map((c) => {
                                    const isActive = c.id === activeId;
                                    return (_jsxs("button", { onClick: () => {
                                            setActiveId(c.id);
                                            router.replace(`/chat?chat=${c.id}`, { scroll: false });
                                        }, className: `flex w-full items-center gap-3 border-b border-charcoal-50 px-4 py-3.5 text-left transition ${isActive ? 'bg-emerald-50/70' : 'hover:bg-charcoal-50/60'}`, children: [_jsx("span", { className: "relative shrink-0", children: c.listingImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                _jsx("img", { src: c.listingImage, alt: "", className: "h-11 w-11 rounded-xl object-cover" })) : (_jsx("span", { className: "flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-lg", children: "\uD83C\uDFF7\uFE0F" })) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsxs("span", { className: "flex items-baseline justify-between gap-2", children: [_jsx("span", { className: "truncate text-sm font-bold text-charcoal-950", children: c.otherName }), c.lastMessageAt && _jsx("span", { className: "shrink-0 text-[10px] font-medium text-charcoal-400", children: timeAgo(c.lastMessageAt) })] }), _jsx("span", { className: "block truncate text-xs text-charcoal-500", children: c.lastMessage ?? _jsxs("span", { className: "italic text-charcoal-300", children: ["Say hello about \u201C", c.listingTitle, "\u201D"] }) }), _jsxs("span", { className: "mt-0.5 block truncate text-[10px] font-medium text-emerald-600", children: [c.listingTitle, " \u00B7 ", formatPrice(c.listingPrice)] })] })] }, c.id));
                                })] })] }), _jsx("section", { className: `min-w-0 flex-1 flex-col md:flex ${activeId ? 'flex' : 'hidden'}`, children: !active ? (_jsxs("div", { className: "hidden h-full flex-col items-center justify-center gap-3 p-8 text-center md:flex", children: [_jsx("span", { className: "flex h-16 w-16 items-center justify-center rounded-3xl bg-charcoal-50 text-charcoal-300", children: _jsx(IconChat, { className: "h-8 w-8" }) }), _jsx("p", { className: "text-sm font-semibold text-charcoal-800", children: "Select a conversation" }), _jsx("p", { className: "max-w-xs text-xs leading-relaxed text-charcoal-400", children: "Pick a chat on the left, or start a new one from any marketplace listing." })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-3 border-b border-charcoal-100 px-4 py-3", children: [_jsx("button", { onClick: () => setActiveId(null), className: "flex h-9 w-9 items-center justify-center rounded-full text-charcoal-500 transition hover:bg-charcoal-50 md:hidden", "aria-label": "Back to conversations", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", className: "h-5 w-5", children: _jsx("path", { d: "M19 12H5m6 6-6-6 6-6" }) }) }), _jsx("span", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-sm font-bold text-white", children: initials(active.otherName) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("p", { className: "flex flex-wrap items-center gap-1.5 text-sm font-bold text-charcoal-950", children: [active.otherName, active.otherVerified && _jsx(VerifiedBadge, {})] }), _jsxs("p", { className: "truncate text-xs text-charcoal-400", children: [active.otherNeighborhood, " \u00B7 chatting about", ' ', _jsx(Link, { href: `/listing/${active.listingId}`, className: "font-semibold text-emerald-600 hover:text-emerald-500", children: active.listingTitle })] })] })] }), _jsxs("div", { className: "flex-1 space-y-3 overflow-y-auto bg-charcoal-50/40 px-4 py-5", children: [loadingThread && messages.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center", children: _jsx("span", { className: "h-6 w-6 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin-slow" }) })) : (messages.map((m) => {
                                        const mine = m.senderId === currentUserId;
                                        return (_jsx("div", { className: `flex ${mine ? 'justify-end' : 'justify-start'}`, children: _jsxs("div", { className: `max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${mine
                                                    ? 'rounded-br-md bg-emerald-600 text-white'
                                                    : 'rounded-bl-md border border-charcoal-100 bg-white text-charcoal-800'}`, children: [_jsx("p", { className: "whitespace-pre-wrap break-words text-sm leading-relaxed", children: m.content }), _jsx("p", { className: `mt-1 text-[10px] font-medium ${mine ? 'text-emerald-100/80' : 'text-charcoal-400'}`, children: formatTime(m.createdAt) })] }) }, m.id));
                                    })), _jsx("div", { ref: endRef })] }), _jsxs("form", { onSubmit: send, className: "flex items-center gap-2 border-t border-charcoal-100 bg-white px-4 py-3", children: [_jsx("input", { value: input, onChange: (e) => setInput(e.target.value), placeholder: `Message ${active.otherName}…`, maxLength: 2000, className: "flex-1 rounded-full border border-charcoal-200 bg-charcoal-50/60 px-4 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" }), _jsx("button", { type: "submit", disabled: !input.trim() || sending, "aria-label": "Send message", className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95 disabled:opacity-40", children: _jsx(IconSend, { className: "h-5 w-5" }) })] })] })) })] }) }));
}
