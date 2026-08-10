'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { initials } from '@/lib/format';
import { useToast } from './Toaster';
import { IconChat, IconChevronDown, IconLogout, IconMenu, IconPlus, IconSearch, IconShield, IconUser, IconX, } from './icons';
const NAV_LINKS = [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/chat', label: 'Chats' },
    { href: '/profile', label: 'Profile' },
];
export function adminNavLinks(user) {
    return user?.isAdmin ? [...NAV_LINKS, { href: '/admin', label: 'Admin' }] : NAV_LINKS;
}
export default function Navbar({ user }) {
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const [q, setQ] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const dropdownRef = useRef(null);
    // Debounced search → navigates to the marketplace feed with ?q=
    useEffect(() => {
        const t = setTimeout(() => {
            if (q.trim()) {
                router.push(`/marketplace?q=${encodeURIComponent(q.trim())}`);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [q, router]);
    useEffect(() => {
        const onClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target))
                setDropdownOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);
    const logout = async () => {
        setDropdownOpen(false);
        await fetch('/api/auth/logout', { method: 'POST' });
        toast('You have been signed out. See you soon!', 'info');
        router.push('/');
        router.refresh();
    };
    return (_jsxs("header", { className: "sticky top-0 z-50 border-b border-charcoal-100 bg-white/85 backdrop-blur-md", children: [_jsxs("div", { className: "mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8", children: [_jsxs(Link, { href: "/marketplace", className: "flex shrink-0 items-center gap-2", children: [_jsx("span", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-extrabold text-white shadow-emerald", children: "T" }), _jsx("span", { className: "hidden text-lg font-extrabold tracking-tight text-charcoal-950 sm:block", children: "TownTrade" })] }), _jsxs("div", { className: "relative mx-auto hidden max-w-md flex-1 md:block", children: [_jsx(IconSearch, { className: "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300" }), _jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search items, gigs, services\u2026", className: "w-full rounded-full border border-charcoal-200 bg-charcoal-50/60 py-2 pl-10 pr-4 text-sm text-charcoal-900 placeholder:text-charcoal-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("nav", { className: "hidden items-center gap-1 lg:flex", children: adminNavLinks(user).map((l) => {
                                    const active = pathname === l.href || (l.href !== '/marketplace' && pathname.startsWith(l.href));
                                    return (_jsx(Link, { href: l.href, className: `rounded-full px-3.5 py-2 text-sm font-semibold transition ${active ? 'bg-emerald-50 text-emerald-700' : 'text-charcoal-600 hover:bg-charcoal-50 hover:text-charcoal-950'}`, children: l.label }, l.href));
                                }) }), _jsxs(Link, { href: "/listing/new", className: "hidden items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98] sm:inline-flex", children: [_jsx(IconPlus, { className: "h-4 w-4" }), "Post a Listing"] }), _jsxs("div", { className: "relative", ref: dropdownRef, children: [_jsxs("button", { onClick: () => setDropdownOpen((v) => !v), "aria-label": "Profile menu", className: "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-charcoal-50", children: [_jsx("span", { className: "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-bold text-white", children: initials(user.fullName) }), _jsx(IconChevronDown, { className: "hidden h-4 w-4 text-charcoal-400 sm:block" })] }), dropdownOpen && (_jsxs("div", { className: "absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-lift animate-pop-in", children: [_jsxs("div", { className: "border-b border-charcoal-100 bg-charcoal-50/60 px-4 py-3", children: [_jsx("p", { className: "truncate text-sm font-bold text-charcoal-950", children: user.fullName }), _jsxs("p", { className: "truncate text-xs text-charcoal-400", children: [user.neighborhood, user.locationVerified && _jsx("span", { className: "ml-1 font-semibold text-emerald-600", children: "\u00B7 Verified" })] })] }), _jsxs("div", { className: "p-1.5", children: [_jsx(MenuItem, { href: "/profile", icon: _jsx(IconUser, { className: "h-4 w-4" }), onClick: () => setDropdownOpen(false), children: "My Profile" }), _jsx(MenuItem, { href: "/profile?tab=payout", icon: _jsx(IconUser, { className: "h-4 w-4" }), onClick: () => setDropdownOpen(false), children: "Payout Settings" }), _jsx(MenuItem, { href: "/chat", icon: _jsx(IconChat, { className: "h-4 w-4" }), onClick: () => setDropdownOpen(false), children: "Messages" }), user.isAdmin && _jsx(MenuItem, { href: "/admin", icon: _jsx(IconShield, { className: "h-4 w-4" }), onClick: () => setDropdownOpen(false), children: "Admin Dashboard" }), _jsxs("button", { onClick: logout, className: "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-charcoal-700 transition hover:bg-red-50 hover:text-red-700", children: [_jsx(IconLogout, { className: "h-4 w-4" }), "Sign Out"] })] })] }))] }), _jsx("button", { onClick: () => setMobileOpen((v) => !v), "aria-label": "Toggle menu", className: "flex h-10 w-10 items-center justify-center rounded-full text-charcoal-600 transition hover:bg-charcoal-50 md:hidden", children: mobileOpen ? _jsx(IconX, { className: "h-5 w-5" }) : _jsx(IconMenu, { className: "h-5 w-5" }) })] })] }), mobileOpen && (_jsxs("div", { className: "border-t border-charcoal-100 bg-white px-4 py-4 md:hidden animate-fade-in", children: [_jsxs("div", { className: "relative mb-4", children: [_jsx(IconSearch, { className: "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300" }), _jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search the marketplace\u2026", className: "w-full rounded-full border border-charcoal-200 bg-charcoal-50/60 py-2.5 pl-10 pr-4 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" })] }), _jsxs("nav", { className: "flex flex-col gap-1", children: [adminNavLinks(user).map((l) => (_jsx(Link, { href: l.href, onClick: () => setMobileOpen(false), className: "rounded-xl px-3 py-2.5 text-sm font-semibold text-charcoal-700 transition hover:bg-charcoal-50", children: l.label }, l.href))), _jsxs(Link, { href: "/listing/new", onClick: () => setMobileOpen(false), className: "mt-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-emerald", children: [_jsx(IconPlus, { className: "h-4 w-4" }), "Post a Listing"] })] })] }))] }));
}
function MenuItem({ href, icon, children, onClick, }) {
    return (_jsxs(Link, { href: href, onClick: onClick, className: "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-charcoal-700 transition hover:bg-emerald-50 hover:text-emerald-700", children: [icon, children] }));
}
