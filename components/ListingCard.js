'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CATEGORY_EMOJIS, CATEGORY_LABELS } from '@/lib/types';
import { formatPrice } from '@/lib/format';
import { useToast } from './Toaster';
import StarRating from './StarRating';
import { IconChat, IconMapPin } from './icons';
export default function ListingCard({ listing, viewerId }) {
    const router = useRouter();
    const { toast } = useToast();
    const isOwner = viewerId != null && listing.seller.id === viewerId;
    const messageSeller = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const res = await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: listing.id, sellerId: listing.seller.id }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 401)
                    return router.push('/#auth');
                toast(data.error || 'Could not start a chat.', 'error');
                return;
            }
            router.push(`/chat?chat=${data.chat.id}`);
        }
        catch {
            toast('Network error. Please try again.', 'error');
        }
    };
    return (_jsxs(Link, { href: `/listing/${listing.id}`, className: "group flex flex-col overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lift", children: [_jsxs("div", { className: "relative aspect-[4/3] overflow-hidden bg-charcoal-50", children: [listing.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    _jsx("img", { src: listing.image, alt: listing.title, className: "h-full w-full object-cover transition duration-500 group-hover:scale-105" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center text-4xl", children: CATEGORY_EMOJIS[listing.category] })), _jsxs("span", { className: "absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-charcoal-800 backdrop-blur", children: [CATEGORY_EMOJIS[listing.category], " ", CATEGORY_LABELS[listing.category]] }), listing.status === 'sold' && (_jsx("span", { className: "absolute right-3 top-3 rounded-full bg-charcoal-950/80 px-2.5 py-1 text-[11px] font-bold text-white", children: "Sold" }))] }), _jsxs("div", { className: "flex flex-1 flex-col gap-2.5 p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("h3", { className: "line-clamp-1 text-[15px] font-bold text-charcoal-950 transition group-hover:text-emerald-700", children: listing.title }), _jsx("p", { className: `shrink-0 text-base font-extrabold ${listing.price > 0 ? 'text-emerald-600' : 'text-charcoal-900'}`, children: formatPrice(listing.price) })] }), _jsx("p", { className: "line-clamp-2 text-sm leading-relaxed text-charcoal-500", children: listing.description }), _jsxs("div", { className: "mt-auto space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("span", { className: "inline-flex min-w-0 items-center gap-1 text-xs font-medium text-charcoal-500", children: [_jsx(IconMapPin, { className: "h-3.5 w-3.5 shrink-0 text-emerald-600" }), _jsx("span", { className: "truncate", children: listing.seller.neighborhood }), listing.seller.locationVerified && (_jsxs("span", { className: "hidden items-center gap-0.5 text-[11px] font-semibold text-emerald-600 sm:inline-flex", children: [_jsx("span", { className: "inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" }), " verified"] }))] }), _jsx(StarRating, { value: listing.seller.avgRating, count: listing.seller.reviewCount, size: "sm" })] }), _jsxs("div", { className: "flex items-center justify-between border-t border-charcoal-100 pt-2.5", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [_jsx("span", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-[10px] font-bold text-white", children: listing.seller.fullName
                                                    .split(' ')
                                                    .map((p) => p[0])
                                                    .slice(0, 2)
                                                    .join('')
                                                    .toUpperCase() }), _jsx("span", { className: "truncate text-xs font-semibold text-charcoal-700", children: listing.seller.fullName })] }), isOwner ? (_jsx("span", { className: "rounded-full bg-charcoal-100 px-2.5 py-1 text-[11px] font-bold text-charcoal-700", children: "Your listing" })) : (_jsxs("button", { onClick: messageSeller, className: "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100 active:scale-95", children: [_jsx(IconChat, { className: "h-3.5 w-3.5" }), "Message Seller"] }))] })] })] })] }));
}
export function ListingCardSkeleton() {
    return (_jsxs("div", { className: "overflow-hidden rounded-2xl border border-charcoal-100 bg-white", children: [_jsx("div", { className: "aspect-[4/3] animate-pulse bg-charcoal-100" }), _jsxs("div", { className: "space-y-3 p-4", children: [_jsxs("div", { className: "flex justify-between gap-3", children: [_jsx("div", { className: "h-4 w-2/3 animate-pulse rounded-full bg-charcoal-100" }), _jsx("div", { className: "h-4 w-14 animate-pulse rounded-full bg-emerald-100" })] }), _jsx("div", { className: "h-3 w-full animate-pulse rounded-full bg-charcoal-50" }), _jsx("div", { className: "h-3 w-4/5 animate-pulse rounded-full bg-charcoal-50" }), _jsxs("div", { className: "flex items-center justify-between pt-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("div", { className: "h-6 w-6 animate-pulse rounded-full bg-charcoal-100" }), _jsx("div", { className: "h-3 w-16 animate-pulse rounded-full bg-charcoal-100" })] }), _jsx("div", { className: "h-6 w-20 animate-pulse rounded-full bg-charcoal-100" })] })] })] }));
}
