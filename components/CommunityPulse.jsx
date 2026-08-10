'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { formatPrice, initials, timeAgo } from '@/lib/format';
import { IconArrowRight, IconBolt, IconCheck, IconUser, IconUsers } from './icons';

export default function CommunityPulse({ initial }) {
    const [data, setData] = useState(initial);
    const [alive, setAlive] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch('/api/community/pulse', { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                setData((prev) => ({ ...prev, ...json }));
                setAlive(true);
            }
        } catch {
            setAlive(false);
        }
    }, []);

    useEffect(() => {
        const t = setInterval(refresh, 8000);
        return () => clearInterval(t);
    }, [refresh]);

    const stats = data?.stats;
    const pulse = data?.pulse;
    const recent = pulse?.recent ?? [];
    const series = pulse?.series ?? [];
    const max = Math.max(1, ...series.map((b) => b.value));
    const totalRevenue = pulse?.totalRevenue ?? 0;

    return (
        <section id="community-pulse" className="scroll-mt-20 border-t border-charcoal-100 bg-white py-20">
            <div className="container-page">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Live community board</span>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-charcoal-950 sm:text-4xl">Real numbers, straight from your neighborhood</h2>
                    <p className="mt-4 text-lg text-charcoal-500">
                        No projections — every number below is computed live from what neighbors are actually doing on TownTrade.
                    </p>
                </div>

                {/* Real stats */}
                <div className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <PulseStat icon={<IconBolt className="h-4 w-4" />} value={stats ? (stats.listings ?? 0).toLocaleString() : '—'} label="Items & gigs listed" accent />
                    <PulseStat icon={<IconUsers className="h-4 w-4" />} value={stats ? (stats.verifiedNeighbors ?? 0).toLocaleString() : '—'} label="Verified neighbors" />
                    <PulseStat icon={<IconCheck className="h-4 w-4" />} value={stats ? (stats.tradesCompleted ?? 0).toLocaleString() : '—'} label="Trades completed" />
                    <PulseStat icon={<IconArrowRight className="h-4 w-4" />} value={stats ? formatPrice(stats.localEconomy ?? 0) : '—'} label="Kept in the local economy" accent />
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-5">
                    {/* Sign-in feed */}
                    <div className="rounded-3xl border border-charcoal-100 bg-white p-6 shadow-soft lg:col-span-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-charcoal-950">Activity</h3>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${alive ? 'bg-emerald-50 text-emerald-700' : 'bg-charcoal-50 text-charcoal-400'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${alive ? 'animate-pulse bg-emerald-500' : 'bg-charcoal-300'}`} />
                                {alive ? 'Live' : 'Offline'}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-charcoal-400">Real sign-ins and sign-ups, updated every few seconds.</p>
                        <div className="mt-5 space-y-1">
                            {recent.length === 0 && (
                                <p className="rounded-2xl bg-charcoal-50/50 px-4 py-8 text-center text-sm text-charcoal-400">No activity yet — be the first to sign in!</p>
                            )}
                            {recent.map((e) => (
                                <div key={e.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-charcoal-50/60">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${e.eventType === 'signup' ? 'bg-charcoal-950' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'}`}>
                                        {initials(e.fullName)}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-charcoal-900">
                                            {e.fullName}
                                            <span className={`ml-1.5 text-[10px] font-bold uppercase tracking-wide ${e.eventType === 'signup' ? 'text-charcoal-500' : 'text-emerald-600'}`}>
                                                {e.eventType === 'signup' ? 'Joined' : 'Signed in'}
                                            </span>
                                        </span>
                                        <span className="block text-xs text-charcoal-400">
                                            {e.neighborhood} · {timeAgo(e.createdAt)}
                                        </span>
                                    </span>
                                    <IconUser className="h-4 w-4 shrink-0 text-charcoal-200" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Revenue over time */}
                    <div className="rounded-3xl border border-charcoal-100 bg-white p-6 shadow-soft lg:col-span-3">
                        <div className="flex flex-wrap items-end justify-between gap-2">
                            <div>
                                <h3 className="text-base font-extrabold text-charcoal-950">Revenue over time</h3>
                                <p className="mt-1 text-xs text-charcoal-400">TownTrade's 5% platform fee on completed trades — real transactions only.</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black tracking-tight text-emerald-600">{formatPrice(totalRevenue)}</p>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-charcoal-400">all-time platform fees</p>
                            </div>
                        </div>
                        <div className="mt-6 flex h-40 items-end gap-1.5">
                            {series.map((b, i) => (
                                <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
                                    <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-charcoal-950 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                                        {formatPrice(b.value)}
                                    </div>
                                    <div
                                        className="w-full rounded-t-md bg-emerald-500/70 transition-all duration-300 group-hover:bg-emerald-600"
                                        style={{ height: `${Math.max(2, (b.value / max) * 100)}%` }}
                                    />
                                    {i % 2 === 0 || i === series.length - 1 ? (
                                        <span className="mt-1.5 block truncate text-center text-[9px] font-semibold text-charcoal-400">{b.label}</span>
                                    ) : (
                                        <span className="mt-1.5 block h-[13px]" />
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-center text-[11px] text-charcoal-300">Each bar is one day · hover for the exact amount</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function PulseStat({ icon, value, label, accent = false }) {
    return (
        <div className={`rounded-2xl border p-4 text-center transition hover:-translate-y-0.5 ${accent ? 'border-emerald-100 bg-emerald-50/50' : 'border-charcoal-100 bg-white'}`}>
            <span className={`mx-auto inline-flex h-9 w-9 items-center justify-center rounded-xl ${accent ? 'bg-emerald-600 text-white' : 'bg-charcoal-950 text-white'}`}>
                {icon}
            </span>
            <p className={`mt-2.5 text-2xl font-black tracking-tight ${accent ? 'text-emerald-700' : 'text-charcoal-950'}`}>{value}</p>
            <p className="mt-0.5 text-xs font-medium text-charcoal-500">{label}</p>
        </div>
    );
}
