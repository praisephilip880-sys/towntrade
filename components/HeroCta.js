'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuthModal } from './AuthProvider';
import { IconArrowRight } from './icons';
export default function HeroCta() {
    const { openAuth } = useAuthModal();
    return (_jsxs("div", { className: "flex flex-col items-center gap-3 sm:flex-row sm:justify-center", children: [_jsxs("button", { onClick: () => openAuth('login', '/marketplace'), className: "group inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-base font-bold text-white shadow-emerald transition hover:bg-emerald-500 hover:shadow-lift active:scale-[0.98]", children: ["Explore Marketplace", _jsx(IconArrowRight, { className: "h-4 w-4 transition group-hover:translate-x-0.5" })] }), _jsx("a", { href: "#how-it-works", className: "inline-flex items-center gap-2 rounded-full border border-charcoal-200 bg-white px-7 py-3.5 text-base font-bold text-charcoal-800 transition hover:border-charcoal-300 hover:bg-charcoal-50", children: "How it Works" })] }));
}
