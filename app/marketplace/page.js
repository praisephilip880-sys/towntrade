import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Navbar from '@/components/Navbar';
import FilterBar from '@/components/FilterBar';
import ListingCard from '@/components/ListingCard';
import { requireUser } from '@/lib/auth';
import { fetchFeedListings } from '@/lib/listings';
import { isCategory, isSortKey } from '@/lib/types';
import { IconMapPin, IconSearch } from '@/components/icons';
export default async function MarketplacePage({ searchParams }) {
    const user = requireUser();
    const rawQ = searchParams.q;
    const rawCategory = searchParams.category;
    const rawSort = searchParams.sort;
    const filters = {
        q: typeof rawQ === 'string' ? rawQ.slice(0, 100) : '',
        category: isCategory(rawCategory) ? rawCategory : 'all',
        sort: isSortKey(rawSort) ? rawSort : 'newest',
    };
    const listings = fetchFeedListings({
        q: filters.q,
        category: filters.category,
        sort: filters.sort,
        status: 'active',
    });
    return (_jsxs("div", { className: "min-h-screen bg-charcoal-50/30", children: [_jsx(Navbar, { user: user }), _jsxs("main", { className: "container-page py-8", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-2xl font-black tracking-tight text-charcoal-950 sm:text-3xl", children: "Neighborhood Marketplace" }), _jsxs("p", { className: "mt-1.5 inline-flex flex-wrap items-center gap-x-1.5 text-sm text-charcoal-500", children: [_jsx(IconMapPin, { className: "h-4 w-4 text-emerald-600" }), "Showing items near ", _jsx("span", { className: "font-bold text-charcoal-800", children: user.neighborhood }), user.locationVerified && (_jsx("span", { className: "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200", children: "Verified Neighbor" })), !user.locationVerified && (_jsx("span", { className: "text-xs text-charcoal-400", children: "\u2014 verify your location from your profile to build trust" }))] })] }),            (!user.locationVerified || !user.notificationsEnabled) && (_jsxs("div", { className: "mb-6 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold text-emerald-800", children: "\uD83D\uDCCD Make your account fully trusted" }), _jsx("p", { className: "mt-0.5 text-xs leading-relaxed text-emerald-700/80", children: user.locationVerified ? 'Turn on browser notifications so you never miss a payment, payout, or refund update.' : 'Verify your real location to earn the Verified Neighbor badge and turn on notifications for payment updates.' })] }), _jsx("a", { href: "/profile?tab=payout", className: "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95", children: "Set up now" })] })), _jsx("div", { className: "mb-7", children: _jsx(FilterBar, { current: filters }) }), listings.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-charcoal-200 bg-white px-6 py-20 text-center", children: [_jsx("span", { className: "flex h-14 w-14 items-center justify-center rounded-2xl bg-charcoal-50 text-charcoal-400", children: _jsx(IconSearch, { className: "h-7 w-7" }) }), _jsx("p", { className: "text-base font-bold text-charcoal-950", children: "No listings found" }), _jsx("p", { className: "max-w-sm text-sm leading-relaxed text-charcoal-400", children: filters.q
                                    ? `Nothing matches “${filters.q}”. Try a different search or clear your filters.`
                                    : 'Try a different category, or be the first to post something new.' }), _jsx("a", { href: "/listing/new", className: "mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500", children: "+ Post a Listing" })] })) : (_jsx("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", children: listings.map((l) => (_jsx(ListingCard, { listing: l, viewerId: user.id }, l.id))) }))] })] }));
}
