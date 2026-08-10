import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import LandingNav from '@/components/LandingNav';
import HeroCta from '@/components/HeroCta';
import CategoryTiles from '@/components/CategoryTiles';
import CommunityPulse from '@/components/CommunityPulse';
import { IconBolt, IconChat, IconShield } from '@/components/icons';
import { fetchCommunityStats, fetchPulse } from '@/lib/community';
import { svgDataUrl } from '@/lib/seedImages';
const HOW_IT_WORKS = [
    {
        icon: _jsx(IconBolt, { className: "h-6 w-6" }),
        step: '01',
        title: 'List Instantly',
        description: 'Snap a photo, add a price, and publish in under a minute. Your items and services go live to verified neighbors in your area instantly.',
        accent: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    },
    {
        icon: _jsx(IconChat, { className: "h-6 w-6" }),
        step: '02',
        title: 'Chat Securely',
        description: 'Message sellers directly inside TownTrade — no phone numbers or awkward DMs. Every conversation is private and tied to the listing.',
        accent: 'bg-charcoal-50 text-charcoal-800 ring-charcoal-100',
    },
    {
        icon: _jsx(IconShield, { className: "h-6 w-6" }),
        step: '03',
        title: 'Trade Safely',
        description: 'Pay through TownTrade escrow. Funds release to the seller only after you confirm delivery — protected on both sides of the deal.',
        accent: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    },
];
const PREVIEW_LISTINGS = [
    {
        image: svgDataUrl('Vintage Oak Bookshelf', '📚', 'items'),
        title: 'Vintage Oak Bookshelf',
        price: '$85',
        neighborhood: 'Riverside',
        rating: 5.0,
        tag: '🛍️ Items for Sale',
    },
    {
        image: svgDataUrl('Garden Lawn Mowing', '🌿', 'gigs'),
        title: 'Garden Lawn Mowing',
        price: '$40',
        neighborhood: 'Maple Grove',
        rating: 4.3,
        tag: '🛠️ Gigs & Services',
    },
    {
        image: svgDataUrl('Moving Boxes — Free', '📦', 'free'),
        title: 'Moving Boxes (Free)',
        price: 'Free',
        neighborhood: 'Riverside',
        rating: 5.0,
        tag: '🎁 Free Stuff',
    },
];
const fmtMoney = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
export default function LandingPage() {
    // Real numbers straight from the database — never hardcoded.
    const stats = fetchCommunityStats();
    const pulse = fetchPulse(14);
    const fmt = (n) => n.toLocaleString('en-US');
    const STATS = [
        { value: fmt(stats.listings), label: 'Items & gigs listed' },
        { value: fmt(stats.verifiedNeighbors), label: 'Verified neighbors' },
        { value: fmt(stats.tradesCompleted), label: 'Trades completed' },
        { value: fmtMoney(stats.localEconomy), label: 'Kept in the local economy' },
    ];
    return (_jsxs("div", { className: "hero-glow min-h-screen bg-white", children: [_jsx(LandingNav, {}), _jsxs("section", { className: "relative overflow-hidden", children: [_jsx("div", { className: "texture-dots pointer-events-none absolute inset-0 opacity-60" }), _jsxs("div", { className: "container-page relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24", children: [_jsxs("div", { className: "text-center lg:text-left", children: [_jsxs("span", { className: "inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-emerald-500" }), `Trusted by ${fmt(stats.verifiedNeighbors)} verified neighbors across the city`] }), _jsxs("h1", { className: "mt-5 text-4xl font-black leading-[1.08] tracking-tight text-charcoal-950 sm:text-5xl lg:text-[3.4rem]", children: ["TownTrade: Trade, Earn, and Connect Right in Your", ' ', _jsx("span", { className: "text-gradient-emerald", children: "Neighborhood" })] }), _jsx("p", { className: "mx-auto mt-5 max-w-xl text-lg leading-relaxed text-charcoal-500 lg:mx-0", children: "The secure local marketplace where verified neighbors buy, sell, and trade with confidence \u2014 private chats, escrow-protected payments, and zero strangers." }), _jsx("div", { className: "mt-8", children: _jsx(HeroCta, {}) }), _jsxs("div", { className: "mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-charcoal-500 lg:justify-start", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx(IconShield, { className: "h-4 w-4 text-emerald-600" }), " Escrow-protected payments"] }), _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx(IconChat, { className: "h-4 w-4 text-emerald-600" }), " Built-in secure chat"] }), _jsx("span", { className: "inline-flex items-center gap-1.5", children: "\u2705 Verified neighbors only" })] })] }), _jsx("div", { className: "relative mx-auto hidden h-[28rem] w-full max-w-md lg:block", children: _jsx("div", { className: "relative", children: PREVIEW_LISTINGS.map((p, i) => (_jsxs("div", { className: `absolute left-1/2 w-72 -translate-x-1/2 overflow-hidden rounded-3xl border border-charcoal-100 bg-white shadow-lift ${i === 0 ? 'top-0 z-20 animate-float' : i === 1 ? 'top-28 left-[6%] z-10 -rotate-2 animate-float [animation-delay:1.2s]' : 'top-28 left-auto right-[6%] z-10 rotate-2 animate-float [animation-delay:2.1s]'}`, children: [_jsx("img", { src: p.image, alt: "", className: "h-40 w-full object-cover" }), _jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("p", { className: "text-sm font-extrabold text-charcoal-950", children: p.title }), _jsx("p", { className: `text-sm font-extrabold ${p.price === 'Free' ? 'text-charcoal-900' : 'text-emerald-600'}`, children: p.price })] }), _jsxs("div", { className: "mt-2 flex items-center justify-between text-xs", children: [_jsxs("span", { className: "inline-flex items-center gap-1 font-medium text-charcoal-500", children: ["\uD83D\uDCCD ", p.neighborhood] }), _jsxs("span", { className: "inline-flex items-center gap-1 font-bold text-emerald-600", children: ["\u2605 ", p.rating.toFixed(1)] })] }), _jsx("span", { className: "mt-2.5 inline-block rounded-full bg-charcoal-50 px-2 py-0.5 text-[10px] font-bold text-charcoal-600", children: p.tag })] })] }, p.title))) }) })] })] }), _jsx("section", { className: "border-y border-charcoal-100 bg-white", children: _jsx("div", { className: "container-page grid grid-cols-2 gap-6 py-10 lg:grid-cols-4", children: STATS.map((s) => (_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-3xl font-black tracking-tight text-charcoal-950", children: s.value }), _jsx("p", { className: "mt-1 text-sm text-charcoal-500", children: s.label })] }, s.label))) }) }), _jsx(CommunityPulse, { initial: { stats, pulse } }), _jsx("section", { id: "how-it-works", className: "scroll-mt-20 py-20 lg:py-24", children: _jsxs("div", { className: "container-page", children: [_jsxs("div", { className: "mx-auto max-w-2xl text-center", children: [_jsx("span", { className: "text-xs font-black uppercase tracking-[0.2em] text-emerald-600", children: "How it works" }), _jsx("h2", { className: "mt-3 text-3xl font-black tracking-tight text-charcoal-950 sm:text-4xl", children: "From listing to handshake in three easy steps" }), _jsx("p", { className: "mt-4 text-lg leading-relaxed text-charcoal-500", children: "Everything happens inside your neighborhood \u2014 fast, friendly, and protected." })] }), _jsx("div", { className: "mt-12 grid gap-6 md:grid-cols-3", children: HOW_IT_WORKS.map((h) => (_jsxs("div", { className: "group relative overflow-hidden rounded-3xl border border-charcoal-100 bg-white p-7 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lift", children: [_jsx("span", { className: "absolute right-5 top-4 text-5xl font-black text-charcoal-50 transition group-hover:text-emerald-50", children: h.step }), _jsx("span", { className: `relative inline-flex h-12 w-12 items-center justify-center rounded-2xl ring-4 ${h.accent}`, children: h.icon }), _jsx("h3", { className: "relative mt-5 text-lg font-extrabold text-charcoal-950", children: h.title }), _jsx("p", { className: "relative mt-2 text-sm leading-relaxed text-charcoal-500", children: h.description })] }, h.title))) })] }) }), _jsx("section", { id: "categories", className: "scroll-mt-20 border-t border-charcoal-100 bg-charcoal-50/40 py-20", children: _jsxs("div", { className: "container-page", children: [_jsxs("div", { className: "mx-auto max-w-2xl text-center", children: [_jsx("span", { className: "text-xs font-black uppercase tracking-[0.2em] text-emerald-600", children: "Browse by category" }), _jsx("h2", { className: "mt-3 text-3xl font-black tracking-tight text-charcoal-950 sm:text-4xl", children: "Something for every neighbor" }), _jsx("p", { className: "mt-4 text-lg text-charcoal-500", children: "Jump straight into the feed and see what your community is trading." })] }), _jsx("div", { className: "mt-12", children: _jsx(CategoryTiles, {}) })] }) }), _jsx("section", { className: "py-20", children: _jsx("div", { className: "container-page", children: _jsxs("div", { className: "relative overflow-hidden rounded-[2.5rem] border border-emerald-200 bg-emerald-50/70 px-6 py-16 text-center sm:px-12", children: [_jsx("div", { className: "texture-dots pointer-events-none absolute inset-0 opacity-40" }), _jsxs("div", { className: "relative", children: [_jsx("h2", { className: "text-3xl font-black tracking-tight text-charcoal-950 sm:text-4xl", children: "Your neighborhood is waiting." }), _jsx("p", { className: "mx-auto mt-4 max-w-xl text-lg text-charcoal-500", children: "Join TownTrade free, verify your location, and start trading with the people right down the street." }), _jsx("div", { className: "mt-8", children: _jsx(HeroCta, {}) })] })] }) }) }), _jsx("footer", { className: "border-t border-charcoal-100 bg-white", children: _jsxs("div", { className: "container-page flex flex-col items-center justify-between gap-4 py-8 sm:flex-row", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-extrabold text-white", children: "T" }), _jsx("span", { className: "text-sm font-extrabold text-charcoal-950", children: "TownTrade" }), _jsxs("span", { className: "ml-2 text-xs text-charcoal-400", children: ["\u00A9 ", new Date().getFullYear(), " \u00B7 Made with \u2764\uFE0F for local communities"] })] }), _jsxs("div", { className: "flex items-center gap-5 text-xs font-semibold text-charcoal-500", children: [_jsx("a", { href: "#how-it-works", className: "transition hover:text-emerald-600", children: "How it Works" }), _jsx("a", { href: "#categories", className: "transition hover:text-emerald-600", children: "Categories" }), _jsx("span", { className: "cursor-default transition hover:text-emerald-600", children: "Trust & Safety" })] })] }) })] }));
}
