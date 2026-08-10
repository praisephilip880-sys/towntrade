'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuthModal } from './AuthProvider';
import { CATEGORY_EMOJIS, CATEGORY_LABELS, CATEGORIES } from '@/lib/types';
const DESCRIPTIONS = {
    items: 'Pre-loved furniture, electronics, and treasures from neighbors nearby.',
    gigs: 'Local services — cleaning, repairs, tutoring, and hands-on help.',
    free: 'Give-away items and free finds, keeping things out of landfills.',
};
const COUNTS = { items: 412, gigs: 186, free: 97 };
export default function CategoryTiles() {
    const { openAuth } = useAuthModal();
    return (_jsx("div", { className: "grid gap-5 sm:grid-cols-2 lg:grid-cols-3", children: CATEGORIES.map((c) => (_jsxs("button", { onClick: () => openAuth('login', `/marketplace?category=${c}`), className: "group flex flex-col items-start gap-3 rounded-3xl border border-charcoal-100 bg-white p-6 text-left shadow-soft transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lift", children: [_jsx("span", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl transition group-hover:scale-110", children: CATEGORY_EMOJIS[c] }), _jsxs("span", { children: [_jsxs("span", { className: "flex items-center gap-2 text-base font-extrabold text-charcoal-950", children: [CATEGORY_LABELS[c], _jsxs("span", { className: "rounded-full bg-charcoal-50 px-2 py-0.5 text-[11px] font-bold text-charcoal-500", children: [COUNTS[c], " live"] })] }), _jsx("span", { className: "mt-1.5 block text-sm leading-relaxed text-charcoal-500", children: DESCRIPTIONS[c] })] }), _jsxs("span", { className: "mt-1 text-sm font-bold text-emerald-600 transition group-hover:text-emerald-500", children: ["Browse ", CATEGORY_LABELS[c].toLowerCase(), " \u2192"] })] }, c))) }));
}
