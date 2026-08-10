'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, CATEGORY_EMOJIS, CATEGORY_LABELS, SORT_OPTIONS } from '@/lib/types';
import { IconCheck, IconChevronDown, IconX } from './icons';
export default function FilterBar({ current }) {
    const router = useRouter();
    const [sortOpen, setSortOpen] = useState(false);
    const sortRef = useRef(null);
    useEffect(() => {
        const onClick = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target))
                setSortOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);
    const apply = (patch) => {
        const next = { ...current, ...patch };
        const params = new URLSearchParams();
        if (next.q)
            params.set('q', next.q);
        if (next.category !== 'all')
            params.set('category', next.category);
        if (next.sort !== 'newest')
            params.set('sort', next.sort);
        const qs = params.toString();
        router.push(qs ? `/marketplace?${qs}` : '/marketplace');
    };
    const hasFilters = current.category !== 'all' || current.sort !== 'newest' || !!current.q;
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("button", { onClick: () => apply({ category: 'all' }), className: `rounded-full px-4 py-2 text-sm font-semibold transition ${current.category === 'all'
                            ? 'bg-charcoal-950 text-white shadow-sm'
                            : 'border border-charcoal-200 bg-white text-charcoal-600 hover:border-charcoal-300 hover:text-charcoal-950'}`, children: "All" }), CATEGORIES.map((c) => {
                        const active = current.category === c;
                        return (_jsxs("button", { onClick: () => apply({ category: active ? 'all' : c }), className: `inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${active
                                ? 'bg-emerald-600 text-white shadow-emerald'
                                : 'border border-charcoal-200 bg-white text-charcoal-600 hover:border-emerald-300 hover:text-emerald-700'}`, children: [_jsx("span", { children: CATEGORY_EMOJIS[c] }), CATEGORY_LABELS[c]] }, c));
                    }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [hasFilters && (_jsxs("button", { onClick: () => apply({ category: 'all', sort: 'newest', q: '' }), className: "inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-charcoal-500 transition hover:bg-charcoal-50 hover:text-charcoal-800", children: [_jsx(IconX, { className: "h-3.5 w-3.5" }), "Clear"] })), _jsxs("div", { className: "relative", ref: sortRef, children: [_jsxs("button", { onClick: () => setSortOpen((v) => !v), className: "inline-flex items-center gap-2 rounded-full border border-charcoal-200 bg-white px-4 py-2 text-sm font-semibold text-charcoal-700 transition hover:border-charcoal-300", children: ["Sort: ", SORT_OPTIONS.find((s) => s.value === current.sort)?.label ?? 'Newest', _jsx(IconChevronDown, { className: `h-4 w-4 text-charcoal-400 transition ${sortOpen ? 'rotate-180' : ''}` })] }), sortOpen && (_jsx("div", { className: "absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-charcoal-100 bg-white p-1.5 shadow-lift animate-pop-in", children: SORT_OPTIONS.map((s) => (_jsxs("button", { onClick: () => {
                                                apply({ sort: s.value });
                                                setSortOpen(false);
                                            }, className: `flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${current.sort === s.value
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'text-charcoal-700 hover:bg-charcoal-50'}`, children: [s.label, current.sort === s.value && _jsx(IconCheck, { className: "h-4 w-4 text-emerald-600" })] }, s.value))) }))] })] })] }), current.q && (_jsxs("p", { className: "text-sm text-charcoal-500", children: ["Results for", ' ', _jsxs("span", { className: "font-bold text-charcoal-900", children: ["\u201C", current.q, "\u201D"] }), _jsx("button", { onClick: () => apply({ q: '' }), className: "ml-2 font-semibold text-emerald-600 hover:text-emerald-500", children: "clear search" })] }))] }));
}
