import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Navbar from '@/components/Navbar';
import ProfileDashboard from '@/components/ProfileDashboard';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchFeedListings, fetchReviewsForUser, fetchUserRating } from '@/lib/listings';
import { CATEGORY_LABELS } from '@/lib/safety';
export default async function ProfilePage({ searchParams }) {
    const user = requireUser();
    const rawTab = searchParams.tab;
    const initialTab = typeof rawTab === 'string' && ['listings', 'purchases', 'sales', 'reviews', 'payout'].includes(rawTab)
        ? rawTab
        : 'listings';
    const listings = fetchFeedListings({ sellerId: user.id });
    const reviews = fetchReviewsForUser(user.id);
    const rating = fetchUserRating(user.id);
    const txRows = db
        .prepare(`SELECT
         t.id, t.listing_id AS listingId, t.buyer_id AS buyerId, t.seller_id AS sellerId,
         t.amount, t.status, t.created_at AS createdAt, t.completed_at AS completedAt,
         l.title AS listingTitle,
         (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS listingImage,
         u1.full_name AS buyerName, u2.full_name AS sellerName
       FROM transactions t
       JOIN listings l ON l.id = t.listing_id
       JOIN users u1 ON u1.id = t.buyer_id
       JOIN users u2 ON u2.id = t.seller_id
       WHERE t.buyer_id = ? OR t.seller_id = ?
       ORDER BY t.id DESC`)
        .all(user.id, user.id);
    const reviewGiven = (reviewerId, revieweeId, listingId) => !!db
        .prepare('SELECT 1 FROM reviews WHERE reviewer_id = ? AND reviewee_id = ? AND listing_id = ? LIMIT 1')
        .get(reviewerId, revieweeId, listingId);
    const toView = (row, isPurchase) => ({
        id: row.id,
        listingId: row.listingId,
        listingTitle: row.listingTitle,
        listingImage: row.listingImage,
        amount: row.amount,
        status: row.status,
        createdAt: row.createdAt,
        completedAt: row.completedAt,
        counterpartyId: isPurchase ? row.sellerId : row.buyerId,
        counterpartyName: isPurchase ? row.sellerName : row.buyerName,
        // A purchase is "reviewed" when I (the buyer) already rated the seller.
        reviewGiven: isPurchase ? reviewGiven(user.id, row.sellerId, row.listingId) : false,
    });
    const initial = {
        listings,
        purchases: txRows.filter((t) => t.buyerId === user.id).map((t) => toView(t, true)),
        sales: txRows.filter((t) => t.sellerId === user.id).map((t) => toView(t, false)),
        reviews,
        rating,
    };

    // Safety Bot status for the restriction banner.
    const safetyRow = db
        .prepare('SELECT safety_flags, selling_restricted_until, selling_restricted_reason FROM users WHERE id = ?')
        .get(user.id);
    const lastEvent = db
        .prepare('SELECT category, action, created_at AS createdAt FROM safety_events WHERE user_id = ? ORDER BY id DESC LIMIT 1')
        .get(user.id);
    const stillRestricted =
        safetyRow?.selling_restricted_until && new Date(safetyRow.selling_restricted_until).getTime() > Date.now();

    return (_jsxs("div", { className: "min-h-screen bg-charcoal-50/30", children: [_jsx(Navbar, { user: user }), _jsx("main", { className: "py-8", children: _jsxs("div", { className: "mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8", children: [stillRestricted && (_jsxs("div", { className: "mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: "h-5 w-5", children: _jsx("path", { d: "M12 3 2.5 20h19L12 3Zm0 7v4m0 3h.01" }) }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-extrabold text-amber-800", children: "Selling temporarily paused" }), _jsx("p", { className: "mt-1 text-sm leading-relaxed text-amber-800/80",                    children: `The TownTrade Safety Bot flagged a message on your account. Selling access is paused until ${new Date(safetyRow.selling_restricted_until).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}.${lastEvent ? ` Reason: ${CATEGORY_LABELS[lastEvent.category] ?? lastEvent.category}.` : ''} This lifts automatically — keep all trading inside the app.` })] })] })] })), _jsx(ProfileDashboard, { user: user, initial: initial, initialTab: initialTab })] }) })] }));
}
