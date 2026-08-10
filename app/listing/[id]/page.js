import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import StarRating from '@/components/StarRating';
import VerifiedBadge from '@/components/VerifiedBadge';
import ListingDetailActions from '@/components/ListingDetailActions';
import CheckoutSuccessHandler from '@/components/CheckoutSuccessHandler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchListingById, fetchUserRating, getReviewByListing, hasReviewed } from '@/lib/listings';
import { CATEGORY_EMOJIS, CATEGORY_LABELS } from '@/lib/types';
import { formatDate, formatPrice, initials } from '@/lib/format';
import { IconClock, IconMapPin, IconShield } from '@/components/icons';
export default async function ListingPage({ params }) {
    const user = requireUser();
    const id = Number(params.id);
    const listing = Number.isInteger(id) ? fetchListingById(id) : null;
    if (!listing)
        notFound();
    const rating = fetchUserRating(listing.seller.id);
    // Current user's transaction state for this listing (if buyer).
    const txRow = db
        .prepare('SELECT status FROM transactions WHERE listing_id = ? AND buyer_id = ? ORDER BY id DESC LIMIT 1')
        .get(id, user.id);
    const myTransaction = txRow
        ? {
            status: txRow.status,
            reviewGiven: hasReviewed(user.id, listing.seller.id, listing.id),
        }
        : { status: null, reviewGiven: false };
    const reviews = db
        .prepare(`SELECT r.id, r.reviewer_id AS reviewerId, r.rating, r.comment, r.created_at AS createdAt,
              u.full_name AS reviewerName
       FROM reviews r JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewee_id = ?
       ORDER BY r.id DESC LIMIT 10`)
        .all(listing.seller.id);
    const myReview = txRow ? getReviewByListing(user.id, listing.id) : null;
    return (_jsxs("div", { className: "min-h-screen bg-charcoal-50/30", children: [_jsx(Navbar, { user: user }), _jsxs("main", { className: "container-page py-8", children: [_jsx(CheckoutSuccessHandler, {}), _jsx("div", { className: "mb-5 text-sm", children: _jsx(Link, { href: "/marketplace", className: "font-semibold text-charcoal-500 transition hover:text-emerald-600", children: "\u2190 Back to Marketplace" }) }), _jsxs("div", { className: "grid gap-8 lg:grid-cols-[1.5fr_1fr]", children: [_jsxs("div", { children: [_jsx("div", { className: "overflow-hidden rounded-3xl border border-charcoal-100 bg-white shadow-soft", children: _jsx("div", { className: "aspect-[4/3] bg-charcoal-50", children: listing.images[0] ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            _jsx("img", { src: listing.images[0], alt: listing.title, className: "h-full w-full object-cover" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center text-6xl", children: CATEGORY_EMOJIS[listing.category] })) }) }), listing.images.length > 1 && (_jsx("div", { className: "mt-3 grid grid-cols-5 gap-3", children: listing.images.map((src, i) => (_jsx("div", { className: `aspect-square overflow-hidden rounded-2xl border bg-white ${i === 0 ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-charcoal-100'}`, children: _jsx("img", { src: src, alt: `${listing.title} photo ${i + 1}`, className: "h-full w-full object-cover" }) }, i))) }))] }), _jsxs("div", { children: [_jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200", children: [CATEGORY_EMOJIS[listing.category], " ", CATEGORY_LABELS[listing.category]] }), _jsx("h1", { className: "mt-3 text-2xl font-black tracking-tight text-charcoal-950 sm:text-3xl", children: listing.title }), _jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-x-4 gap-y-2", children: [_jsx(StarRating, { value: rating.avg, count: rating.count, size: "md", showValue: true }), _jsxs("span", { className: "inline-flex items-center gap-1 text-sm text-charcoal-500", children: [_jsx(IconMapPin, { className: "h-4 w-4 text-emerald-600" }), listing.seller.neighborhood] }), _jsxs("span", { className: "inline-flex items-center gap-1 text-sm text-charcoal-400", children: [_jsx(IconClock, { className: "h-4 w-4" }), "Listed ", formatDate(listing.createdAt)] })] }), _jsxs("p", { className: "mt-4 text-3xl font-black tracking-tight text-emerald-600", children: [formatPrice(listing.price), listing.price > 0 && _jsx("span", { className: "ml-2 align-middle text-xs font-semibold text-charcoal-400", children: "escrow-protected" })] }), _jsxs("div", { className: "mt-6 rounded-3xl border border-charcoal-100 bg-white p-5 shadow-soft", children: [_jsx("h2", { className: "text-sm font-black uppercase tracking-wide text-charcoal-400", children: "Description" }), _jsx("p", { className: "mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-charcoal-700", children: listing.description })] }), _jsxs("div", { className: "mt-4 rounded-3xl border border-charcoal-100 bg-white p-5 shadow-soft", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-base font-extrabold text-white", children: initials(listing.seller.fullName) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("p", { className: "flex flex-wrap items-center gap-1.5 text-sm font-extrabold text-charcoal-950", children: [listing.seller.fullName, listing.seller.locationVerified && _jsx(VerifiedBadge, {})] }), _jsxs("p", { className: "text-xs text-charcoal-400", children: ["Neighbor in ", listing.seller.neighborhood] })] })] }), _jsx("div", { className: "mt-4", children: _jsx(ListingDetailActions, { listing: listing, viewerId: user.id, myTransaction: myTransaction }) })] })] })] }), _jsxs("section", { className: "mt-12", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsx("h2", { className: "text-xl font-black tracking-tight text-charcoal-950", children: "Neighbor reviews" }), _jsxs("div", { className: "flex items-center gap-2 rounded-full border border-charcoal-100 bg-white px-4 py-2 shadow-soft", children: [_jsx(StarRating, { value: rating.avg, count: rating.count, size: "sm" }), _jsxs("span", { className: "text-sm font-bold text-charcoal-800", children: [rating.count, " review", rating.count === 1 ? '' : 's'] })] })] }), myReview && (_jsxs("div", { className: "mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5", children: [_jsx("p", { className: "text-xs font-black uppercase tracking-wide text-emerald-600", children: "Your review" }), _jsx("div", { className: "mt-2", children: _jsx(StarRating, { value: myReview.rating, size: "sm" }) }), myReview.comment && _jsx("p", { className: "mt-2 text-sm leading-relaxed text-charcoal-700", children: myReview.comment })] })), _jsx("div", { className: "mt-5 grid gap-4 sm:grid-cols-2", children: reviews.length === 0 ? (_jsxs("div", { className: "flex items-center gap-3 rounded-2xl border border-dashed border-charcoal-200 bg-white p-6 text-sm text-charcoal-400 sm:col-span-2", children: [_jsx(IconShield, { className: "h-5 w-5 text-emerald-500" }), "No reviews yet \u2014 be the first neighbor to trade with ", listing.seller.fullName.split(' ')[0], "!"] })) : (reviews.map((r) => (_jsxs("div", { className: "rounded-2xl border border-charcoal-100 bg-white p-5 shadow-soft", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-xs font-bold text-white", children: initials(r.reviewerName) }), _jsx("p", { className: "text-sm font-bold text-charcoal-950", children: r.reviewerName })] }), _jsx("span", { className: "text-xs text-charcoal-400", children: formatDate(r.createdAt) })] }), _jsx("div", { className: "mt-2.5", children: _jsx(StarRating, { value: r.rating, size: "sm" }) }), r.comment && _jsx("p", { className: "mt-2 text-sm leading-relaxed text-charcoal-600", children: r.comment })] }, r.id)))) })] })] })] }));
}
