'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDate, formatPrice, initials, timeAgo } from '@/lib/format';
import { CATEGORY_EMOJIS, CATEGORY_LABELS } from '@/lib/types';
import { useToast } from './Toaster';
import StarRating from './StarRating';
import {
    IconBank, IconCheck, IconEdit, IconShield, IconShieldAlert,
    IconTag, IconTrash, IconUsers,
} from './icons';

const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'listings', label: 'Listings' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'users', label: 'Users' },
];

export default function AdminDashboard({ user, initial, initialTab = 'overview' }) {
    const router = useRouter();
    const { toast } = useToast();
    const [tab, setTab] = useState(initialTab);
    const [listings, setListings] = useState(initial.listings);
    const [transactions, setTransactions] = useState(initial.transactions);
    const [users, setUsers] = useState(initial.users);
    const [overview, setOverview] = useState(initial.overview);
    const [lq, setLq] = useState('');
    const [tq, setTq] = useState('');
    const [uq, setUq] = useState('');
    const [loadingId, setLoadingId] = useState(null);

    const setTabAndUrl = (t) => {
        setTab(t);
        router.replace(t === 'overview' ? '/admin' : `/admin?tab=${t}`, { scroll: false });
    };

    const filteredListings = useMemo(() => {
        const q = lq.trim().toLowerCase();
        if (!q) return listings;
        return listings.filter((l) =>
            l.title.toLowerCase().includes(q) ||
            l.seller.fullName.toLowerCase().includes(q) ||
            l.seller.email.toLowerCase().includes(q)
        );
    }, [listings, lq]);

    const filteredTransactions = useMemo(() => {
        const q = tq.trim().toLowerCase();
        if (!q) return transactions;
        return transactions.filter((t) =>
            t.listingTitle.toLowerCase().includes(q) ||
            t.buyer.fullName.toLowerCase().includes(q) ||
            t.buyer.email.toLowerCase().includes(q) ||
            t.seller.fullName.toLowerCase().includes(q) ||
            t.seller.email.toLowerCase().includes(q)
        );
    }, [transactions, tq]);

    const filteredUsers = useMemo(() => {
        const q = uq.trim().toLowerCase();
        if (!q) return users;
        return users.filter((u) =>
            u.fullName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.neighborhood.toLowerCase().includes(q)
        );
    }, [users, uq]);

    /* ------------------------------ actions ------------------------------ */
    const runAction = async (url, opts, successMsg) => {
        setLoadingId(opts.loadingId);
        try {
            const res = await fetch(url, opts.fetch);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast(data.error || 'Request failed.', 'error');
                return;
            }
            // Update the local list instantly so the UI never shows stale data,
            // even if the background refresh below fails.
            if (opts.onSuccess) opts.onSuccess(data);
            toast(successMsg);
            try {
                await refreshData();
            } catch {
                // Refresh is best-effort; the optimistic update already kept the UI correct.
            }
        } catch {
            toast('Network error. Please try again.', 'error');
        } finally {
            setLoadingId(null);
        }
    };

    const refreshData = async () => {
        const [o, l, t, u] = await Promise.all([
            fetch('/api/admin/overview').then((r) => r.json()),
            fetch('/api/admin/listings').then((r) => r.json()),
            fetch('/api/admin/transactions').then((r) => r.json()),
            fetch('/api/admin/users').then((r) => r.json()),
        ]);
        if (o.overview) setOverview(o.overview);
        if (l.listings) setListings(l.listings);
        if (t.transactions) setTransactions(t.transactions);
        if (u.users) setUsers(u.users);
    };

    const deleteListing = async (id, title) => {
        if (!window.confirm(`Delete “${title}” permanently? Its chats and transactions are removed with it.`)) return;
        await runAction(`/api/listings/${id}`, {
            method: 'DELETE',
            loadingId: `dl-${id}`,
            onSuccess: () => setListings((prev) => prev.filter((l) => l.id !== id)),
        }, 'Listing deleted.');
    };

    const releaseEscrow = async (id) => {
        if (!window.confirm(`Release escrow on transaction #${id}? 95% goes to the seller, 5% platform fee.`)) return;
        await runAction(`/api/admin/transactions/${id}/release`, {
            method: 'POST',
            loadingId: `tx-${id}`,
            onSuccess: () => setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'completed' } : t))),
        }, 'Transaction Complete! 5% platform fee saved, 95% sent to seller.');
    };

    const refundTransaction = async (id) => {
        if (!window.confirm(`Refund transaction #${id}? The buyer gets their money back and the listing is re-activated.`)) return;
        await runAction(`/api/admin/transactions/${id}/refund`, {
            method: 'POST',
            loadingId: `tx-${id}`,
            onSuccess: () => setTransactions((prev) => prev.filter((t) => t.id !== id)),
        }, 'Transaction refunded — listing is active again.');
    };

    const removeRestriction = async (userId, name) => {
        if (!window.confirm(`Lift the selling restriction on ${name}?`)) return;
        setLoadingId(`ur-${userId}`);
        try {
            const res = await fetch(`/api/admin/users/${userId}/restriction`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return toast(data.error || 'Could not lift restriction.', 'error');
            toast('Selling restriction lifted.');
            refreshData();
        } finally {
            setLoadingId(null);
        }
    };

    const deleteUser = async (u) => {
        if (!window.confirm(`Delete ${u.fullName} (${u.email}) permanently?\n\nThis removes their account and ALL of their data: ${u.listingCount} listing(s), ${u.salesCount + u.purchasesCount} transaction(s), plus chats, messages, reviews, safety events and sessions. This cannot be undone.`)) return;
        if (!window.confirm(`Are you absolutely sure? This permanently deletes the account and every trace of it from TownTrade.`)) return;
        await runAction(`/api/admin/users/${u.id}`, {
            method: 'DELETE',
            loadingId: `du-${u.id}`,
            onSuccess: () => setUsers((prev) => prev.filter((x) => x.id !== u.id)),
        }, `Account deleted — ${u.fullName} and all their data removed.`);
    };

    const escrowValue = overview.escrowValue ?? 0;

    /* -------------------------------- render ------------------------------ */
    return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Admin · {user.fullName}</span>
                    <h1 className="mt-1 text-2xl font-black tracking-tight text-charcoal-950 sm:text-3xl">Community Control Center</h1>
                    <p className="mt-1 text-sm text-charcoal-500">Moderate listings, oversee escrow transactions, and manage accounts.</p>
                </div>
                <Link href="/marketplace" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-charcoal-200 bg-white px-4 py-2.5 text-sm font-bold text-charcoal-700 transition hover:border-emerald-300 hover:text-emerald-700">
                    <IconTag className="h-4 w-4" /> View marketplace
                </Link>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Members" value={overview.totalUsers} icon={<IconUsers className="h-4 w-4" />} />
                <Stat label="Active listings" value={overview.activeListings} icon={<IconTag className="h-4 w-4" />} accent />
                <Stat label="In escrow" value={overview.escrowHold} icon={<IconShield className="h-4 w-4" />} warn={overview.escrowHold > 0} />
                <Stat label="Escrow value" value={formatPrice(escrowValue)} icon={<IconBank className="h-4 w-4" />} />
                <Stat label="Completed" value={overview.completed} icon={<IconCheck className="h-4 w-4" />} />
                <Stat label="Restricted" value={overview.restrictedUsers} icon={<IconShieldAlert className="h-4 w-4" />} danger={overview.restrictedUsers > 0} />
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-charcoal-100 bg-white p-1 shadow-soft">
                {TABS.map((t) => (
                    <button key={t.key} onClick={() => setTabAndUrl(t.key)}
                        className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${tab === t.key ? 'bg-charcoal-950 text-white shadow-sm' : 'text-charcoal-600 hover:bg-charcoal-50 hover:text-charcoal-950'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="mt-6">
                {/* ------------------------- OVERVIEW ------------------------- */}
                {tab === 'overview' && (
                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <MiniStat label="Sold listings" value={overview.soldListings} sub={`${overview.totalListings} total`} />
                            <MiniStat label="Transactions" value={overview.totalTransactions} sub={`${overview.completed} completed`} />
                            <MiniStat label="Reviews" value={overview.reviews} sub="neighbor reputation" />
                            <MiniStat label="Chats" value={overview.chats} sub={`${overview.safetyEvents} safety alerts`} />
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                            <RevenueChart series={overview.revenueSeries ?? []} total={overview.revenueTotal ?? 0} />
                            <RecentLogins logins={overview.recentLogins ?? []} />
                        </div>
                        <div className="rounded-3xl border border-charcoal-100 bg-white p-6 shadow-soft">
                            <h3 className="text-base font-extrabold text-charcoal-950">Escrow &amp; fees</h3>
                            <p className="mt-1 text-sm text-charcoal-500">TownTrade holds every purchase in escrow until delivery is confirmed. On release, the seller receives 95% and the platform keeps a 5% fee.</p>
                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Locked in escrow</p>
                                    <p className="mt-1 text-xl font-extrabold text-amber-700">{formatPrice(escrowValue)}</p>
                                </div>
                                <div className="rounded-2xl border border-charcoal-100 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-400">Completed volume</p>
                                    <p className="mt-1 text-xl font-extrabold text-charcoal-950">{formatPrice(overview.completedValue ?? 0)}</p>
                                </div>
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Platform fees earned</p>
                                    <p className="mt-1 text-xl font-extrabold text-emerald-700">{formatPrice(overview.platformFees ?? 0)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ------------------------- LISTINGS ------------------------- */}
                {tab === 'listings' && (
                    <div className="space-y-3">
                        <div className="relative max-w-md">
                            <input value={lq} onChange={(e) => setLq(e.target.value)} placeholder="Search by title, seller name or email…"
                                className="w-full rounded-full border border-charcoal-200 bg-white py-2.5 pl-4 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        {filteredListings.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-charcoal-200 bg-white px-6 py-14 text-center text-sm text-charcoal-400">No listings match.</div>
                        )}
                        {filteredListings.map((l) => (
                            <div key={l.id} className="flex flex-col gap-4 rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
                                <Link href={`/listing/${l.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                                    {l.image ? <img src={l.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">{CATEGORY_EMOJIS[l.category] ?? '🏷️'}</span>}
                                    <span className="min-w-0">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-sm font-bold text-charcoal-950">{l.title}</span>
                                            {l.status === 'sold'
                                                ? <span className="rounded-full bg-charcoal-100 px-2 py-0.5 text-[10px] font-bold text-charcoal-600">Sold</span>
                                                : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">Active</span>}
                                        </span>
                                        <span className="mt-0.5 block text-xs text-charcoal-400">
                                            {l.seller.fullName} · {l.seller.email} · {CATEGORY_LABELS[l.category]} · {l.txCount} tx · {timeAgo(l.createdAt)}
                                        </span>
                                        <span className="mt-1 block text-sm font-bold text-charcoal-900">{formatPrice(l.price)}</span>
                                    </span>
                                </Link>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Link href={`/listing/${l.id}/edit`} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95">
                                        <IconEdit className="h-3.5 w-3.5" /> Edit
                                    </Link>
                                    <button onClick={() => deleteListing(l.id, l.title)} disabled={loadingId === `dl-${l.id}`}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 active:scale-95 disabled:opacity-60">
                                        <IconTrash className="h-3.5 w-3.5" /> {loadingId === `dl-${l.id}` ? '…' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ---------------------- TRANSACTIONS ----------------------- */}
                {tab === 'transactions' && (
                    <div className="space-y-3">
                        <div className="relative max-w-md">
                            <input value={tq} onChange={(e) => setTq(e.target.value)} placeholder="Search by item, buyer or seller…"
                                className="w-full rounded-full border border-charcoal-200 bg-white py-2.5 pl-4 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        {filteredTransactions.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-charcoal-200 bg-white px-6 py-14 text-center text-sm text-charcoal-400">No transactions match.</div>
                        )}
                        {filteredTransactions.map((t) => (
                            <div key={t.id} className="rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                    <Link href={`/listing/${t.listingId}`} className="flex min-w-0 flex-1 items-center gap-4">
                                        {t.listingImage ? <img src={t.listingImage} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-charcoal-50 text-2xl">{CATEGORY_EMOJIS[t.listingCategory] ?? '🛒'}</span>}
                                        <span className="min-w-0">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-sm font-bold text-charcoal-950">{t.listingTitle}</span>
                                                {t.status === 'escrow_hold'
                                                    ? <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Escrow hold</span>
                                                    : <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200"><IconCheck className="h-3 w-3" /> Completed</span>}
                                            </span>
                                            <span className="mt-1 block text-xs text-charcoal-400">
                                                #{t.id} · <span className="font-semibold text-charcoal-600">{t.buyer.fullName}</span> → <span className="font-semibold text-charcoal-600">{t.seller.fullName}</span> · {formatDate(t.createdAt)}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-charcoal-400">{t.buyer.email} · {t.seller.email}</span>
                                            <span className="mt-1 block text-sm font-bold text-charcoal-900">{formatPrice(t.amount)} <span className="text-[11px] font-semibold text-charcoal-400">· 5% fee {formatPrice(t.fee)} · seller gets {formatPrice(t.payout)}</span></span>
                                        </span>
                                    </Link>
                                    {t.status === 'escrow_hold' && (
                                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                                            <button onClick={() => releaseEscrow(t.id)} disabled={loadingId === `tx-${t.id}`}
                                                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95 disabled:opacity-60">
                                                <IconCheck className="h-3.5 w-3.5" /> {loadingId === `tx-${t.id}` ? 'Working…' : 'Release funds'}
                                            </button>
                                            <button onClick={() => refundTransaction(t.id)} disabled={loadingId === `tx-${t.id}`}
                                                className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-amber-600 active:scale-95 disabled:opacity-60">
                                                Refund
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* --------------------------- USERS --------------------------- */}
                {tab === 'users' && (
                    <div className="space-y-3">
                        <div className="relative max-w-md">
                            <input value={uq} onChange={(e) => setUq(e.target.value)} placeholder="Search by name, email or neighborhood…"
                                className="w-full rounded-full border border-charcoal-200 bg-white py-2.5 pl-4 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        {filteredUsers.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-charcoal-200 bg-white px-6 py-14 text-center text-sm text-charcoal-400">No users match.</div>
                        )}
                        {filteredUsers.map((u) => (
                            <div key={u.id} className="flex flex-col gap-4 rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
                                <div className="flex min-w-0 flex-1 items-center gap-4">
                                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${u.isAdmin ? 'bg-charcoal-950' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'}`}>{initials(u.fullName)}</span>
                                    <span className="min-w-0">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-sm font-bold text-charcoal-950">{u.fullName}</span>
                                            {u.isAdmin && <span className="rounded-full bg-charcoal-950 px-2 py-0.5 text-[10px] font-bold text-white">Admin</span>}
                                            {u.locationVerified && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">Verified</span>}
                                            {u.restricted && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">Selling paused</span>}
                                            {u.bankConnected && <span className="rounded-full bg-charcoal-50 px-2 py-0.5 text-[10px] font-bold text-charcoal-500">Bank linked</span>}
                                        </span>
                                        <span className="mt-0.5 block truncate text-xs text-charcoal-400">{u.email} · {u.neighborhood} · member since {formatDate(u.createdAt)}</span>
                                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-charcoal-500">
                                            <span className="font-semibold">{u.activeListings} active</span>·<span>{u.listingCount} listings</span>·<span>{u.salesCount} sales</span>·<span>{u.purchasesCount} purchases</span>
                                            {u.reviewCount > 0 && (<span className="inline-flex items-center gap-1"><StarRating value={u.avgRating} size="xs" /> ({u.reviewCount})</span>)}
                                            {u.safetyFlags > 0 && <span className="font-semibold text-amber-700">⚠ {u.safetyFlags} flag{u.safetyFlags === 1 ? '' : 's'}</span>}
                                        </span>
                                    </span>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                    {u.restricted && (
                                        <button onClick={() => removeRestriction(u.id, u.fullName)} disabled={loadingId === `ur-${u.id}`}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95 disabled:opacity-60">
                                            <IconCheck className="h-3.5 w-3.5" /> {loadingId === `ur-${u.id}` ? '…' : 'Lift restriction'}
                                        </button>
                                    )}
                                    {!u.isAdmin && (
                                        <button onClick={() => deleteUser(u)} disabled={loadingId === `du-${u.id}`}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 active:scale-95 disabled:opacity-60">
                                            <IconTrash className="h-3.5 w-3.5" /> {loadingId === `du-${u.id}` ? 'Deleting…' : 'Delete user'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function Stat({ label, value, icon, accent = false, warn = false, danger = false }) {
    return (
        <div className={`rounded-2xl border bg-white p-3.5 shadow-soft ${danger ? 'border-red-200' : warn ? 'border-amber-200' : 'border-charcoal-100'}`}>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal-400">
                <span className={danger ? 'text-red-500' : warn ? 'text-amber-500' : accent ? 'text-emerald-600' : 'text-charcoal-400'}>{icon}</span>
                {label}
            </div>
            <p className={`mt-1 truncate text-lg font-extrabold ${danger ? 'text-red-600' : warn ? 'text-amber-700' : accent ? 'text-emerald-600' : 'text-charcoal-950'}`}>{value}</p>
        </div>
    );
}

function MiniStat({ label, value, sub }) {
    return (
        <div className="rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-400">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-charcoal-950">{value}</p>
            <p className="mt-0.5 text-xs text-charcoal-400">{sub}</p>
        </div>
    );
}

function RevenueChart({ series, total }) {
    const max = Math.max(1, ...series.map((b) => b.value));
    return (
        <div className="rounded-3xl border border-charcoal-100 bg-white p-5 shadow-soft">
            <div className="flex items-end justify-between gap-2">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-400">Platform revenue · last 14 days</p>
                    <p className="mt-1 text-2xl font-black text-emerald-600">{formatPrice(total)}</p>
                </div>
                <span className="text-[11px] font-semibold text-charcoal-400">5% fee on completed trades</span>
            </div>
            <div className="mt-4 flex h-28 items-end gap-1">
                {series.map((b, i) => (
                    <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
                        <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-charcoal-950 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                            {formatPrice(b.value)}
                        </div>
                        <div className="w-full rounded-t bg-emerald-500/70 transition-all group-hover:bg-emerald-600" style={{ height: `${Math.max(2, (b.value / max) * 100)}%` }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function RecentLogins({ logins }) {
    return (
        <div className="rounded-3xl border border-charcoal-100 bg-white p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-400">Recent activity · real sign-ins</p>
            <div className="mt-3 space-y-1">
                {logins.length === 0 && <p className="py-4 text-center text-xs text-charcoal-400">No activity yet.</p>}
                {logins.map((e) => (
                    <div key={e.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-charcoal-50/60">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${e.eventType === 'signup' ? 'bg-charcoal-950' : 'bg-emerald-600'}`}>
                            {initials(e.fullName)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-charcoal-800">{e.fullName}</span>
                        <span className="shrink-0 text-[10px] text-charcoal-400">{timeAgo(e.createdAt)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
