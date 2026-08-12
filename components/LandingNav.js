'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthModal } from './AuthProvider';
import Logo from './Logo';
import { IconMenu, IconX } from './icons';
export default function LandingNav() {
    const { openAuth } = useAuthModal();
    const router = useRouter();
    const [authed, setAuthed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    useEffect(() => {
        fetch('/api/users/me', { cache: 'no-store' })
            .then((res) => res.ok && setAuthed(true))
            .catch(() => { });
    }, []);
    const go = (path) => {
        if (authed)
            router.push(path);
        else
            openAuth('login', path);
    };
    return (_jsxs("header", { className: "sticky top-0 z-50 border-b border-charcoal-100 bg-white/85 backdrop-blur-md", children: [_jsxs("div", { className: "container-page flex h-16 items-center justify-between", children: [_jsxs("a", { href: "#", className: "flex items-center gap-2", children: [_jsx(Logo, { withWordmark: false }), _jsx("span", { className: "text-lg font-extrabold tracking-tight text-charcoal-950", children: "TownTrade" })] }), _jsxs("nav", { className: "hidden items-center gap-6 md:flex", children: [_jsx("a", { href: "#how-it-works", className: "text-sm font-semibold text-charcoal-600 transition hover:text-charcoal-950", children: "How it Works" }), _jsx("a", { href: "#categories", className: "text-sm font-semibold text-charcoal-600 transition hover:text-charcoal-950", children: "Categories" }), _jsx("button", { onClick: () => go('/marketplace'), className: "rounded-full px-4 py-2 text-sm font-bold text-charcoal-800 transition hover:bg-charcoal-50", children: "Sign In" }), _jsx("button", { onClick: () => (authed ? router.push('/listing/new') : openAuth('register', '/listing/new')), className: "rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98]", children: "Get Started" })] }), _jsx("button", { className: "flex h-10 w-10 items-center justify-center rounded-full text-charcoal-600 transition hover:bg-charcoal-50 md:hidden", onClick: () => setMobileOpen((v) => !v), "aria-label": "Toggle menu", children: mobileOpen ? _jsx(IconX, { className: "h-5 w-5" }) : _jsx(IconMenu, { className: "h-5 w-5" }) })] }), mobileOpen && (_jsx("div", { className: "border-t border-charcoal-100 bg-white px-4 py-4 md:hidden animate-fade-in", children: _jsxs("nav", { className: "flex flex-col gap-1", children: [_jsx("a", { href: "#how-it-works", onClick: () => setMobileOpen(false), className: "rounded-xl px-3 py-2.5 text-sm font-semibold text-charcoal-700 hover:bg-charcoal-50", children: "How it Works" }), _jsx("a", { href: "#categories", onClick: () => setMobileOpen(false), className: "rounded-xl px-3 py-2.5 text-sm font-semibold text-charcoal-700 hover:bg-charcoal-50", children: "Categories" }), _jsx("button", { onClick: () => {
                                setMobileOpen(false);
                                go('/marketplace');
                            }, className: "mt-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-emerald", children: "Explore Marketplace" })] }) }))] }));
}
