import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Navbar from '@/components/Navbar';
import AdminDashboard from '@/components/AdminDashboard';
import { requireAdmin } from '@/lib/auth';
import { fetchPulse } from '@/lib/community';
import { db } from '@/lib/db';
import { fetchAllOpayPayments, fetchRefundRequests } from '@/lib/opay';

export default async function AdminPage({ searchParams }) {
    const user = requireAdmin();
    const rawTab = searchParams.tab;
    const initialTab = typeof rawTab === 'string' && ['overview', 'listings', 'transactions', 'opay', 'refunds', 'users'].includes(rawTab)
        ? rawTab
        : 'overview';

    // Single pulse query shared by the revenue chart and activity feed.
    const pulse = fetchPulse(14);
    const overview = {
        totalUsers: db.prepare('SELECT COUNT(*) AS n FROM users WHERE id > 0').get().n,
        restrictedUsers: db.prepare('SELECT COUNT(*) AS n FROM users WHERE id > 0 AND selling_restricted_until IS NOT NULL AND selling_restricted_until > ?').get(new Date().toISOString()).n,
        totalListings: db.prepare('SELECT COUNT(*) AS n FROM listings').get().n,
        activeListings: db.prepare("SELECT COUNT(*) AS n FROM listings WHERE status = 'active'").get().n,
        soldListings: db.prepare("SELECT COUNT(*) AS n FROM listings WHERE status = 'sold'").get().n,
        totalTransactions: db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n,
        escrowHold: db.prepare("SELECT COUNT(*) AS n FROM transactions WHERE status = 'escrow_hold'").get().n,
        completed: db.prepare("SELECT COUNT(*) AS n FROM transactions WHERE status = 'completed'").get().n,
        escrowValue: db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE status = 'escrow_hold'").get().s,
        completedValue: db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE status = 'completed'").get().s,
        platformFees: Math.round(db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE status = 'completed'").get().s * 0.05),
        reviews: db.prepare('SELECT COUNT(*) AS n FROM reviews').get().n,
        chats: db.prepare('SELECT COUNT(*) AS n FROM chats').get().n,
        safetyEvents: db.prepare('SELECT COUNT(*) AS n FROM safety_events').get().n,
        revenueSeries: pulse.series,
        revenueTotal: pulse.totalRevenue,
        recentLogins: pulse.recent,
    };

    const listings = db
        .prepare(`SELECT
         l.id, l.title, l.price, l.category, l.status, l.created_at AS createdAt,
         u.id AS sellerId, u.full_name AS sellerName, u.email AS sellerEmail, u.neighborhood AS sellerNeighborhood,
         (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS image,
         (SELECT COUNT(*) FROM transactions t WHERE t.listing_id = l.id) AS txCount
       FROM listings l JOIN users u ON u.id = l.user_id
       ORDER BY l.id DESC`)
        .all()
        .map((r) => ({
            id: r.id,
            title: r.title,
            price: r.price,
            category: r.category,
            status: r.status,
            createdAt: r.createdAt,
            image: r.image,
            txCount: r.txCount,
            seller: { id: r.sellerId, fullName: r.sellerName, email: r.sellerEmail, neighborhood: r.sellerNeighborhood },
        }));

    const transactions = db
        .prepare(`SELECT
         t.id, t.amount, t.status, t.payment_method AS paymentMethod, t.created_at AS createdAt, t.completed_at AS completedAt,
         t.listing_id AS listingId, l.title AS listingTitle, l.category AS listingCategory,
         (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS listingImage,
         b.id AS buyerId, b.full_name AS buyerName, b.email AS buyerEmail,
         s.id AS sellerId, s.full_name AS sellerName, s.email AS sellerEmail
       FROM transactions t
       JOIN listings l ON l.id = t.listing_id
       JOIN users b ON b.id = t.buyer_id
       JOIN users s ON s.id = t.seller_id
       ORDER BY t.id DESC`)
        .all()
        .map((r) => ({
            id: r.id,
            listingId: r.listingId,
            listingTitle: r.listingTitle,
            listingCategory: r.listingCategory,
            listingImage: r.listingImage,
            amount: r.amount,
            status: r.status,
            paymentMethod: r.paymentMethod ?? 'stripe',
            createdAt: r.createdAt,
            completedAt: r.completedAt,
            buyer: { id: r.buyerId, fullName: r.buyerName, email: r.buyerEmail },
            seller: { id: r.sellerId, fullName: r.sellerName, email: r.sellerEmail },
        }));

    const users = db
        .prepare(`SELECT
         u.id, u.full_name AS fullName, u.email, u.neighborhood, u.avatar, u.location_verified AS locationVerified,
         u.bank_connected AS bankConnected, u.is_admin AS isAdmin, u.safety_flags AS safetyFlags,
         u.selling_restricted_until AS sellingRestrictedUntil, u.created_at AS createdAt,
         (SELECT COUNT(*) FROM listings l WHERE l.user_id = u.id) AS listingCount,
         (SELECT COUNT(*) FROM listings l WHERE l.user_id = u.id AND l.status = 'active') AS activeListings,
         (SELECT COUNT(*) FROM transactions t WHERE t.seller_id = u.id) AS salesCount,
         (SELECT COUNT(*) FROM transactions t WHERE t.buyer_id = u.id) AS purchasesCount,
         (SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.reviewee_id = u.id) AS avgRating,
         (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_id = u.id) AS reviewCount
       FROM users u WHERE u.id > 0 ORDER BY u.id ASC`)
        .all()
        .map((r) => ({
            id: r.id,
            fullName: r.fullName,
            email: r.email,
            neighborhood: r.neighborhood,
            avatar: r.avatar ?? null,
            locationVerified: r.locationVerified === 1,
            bankConnected: r.bankConnected === 1,
            isAdmin: r.isAdmin === 1,
            safetyFlags: r.safetyFlags,
            restricted: !!(r.sellingRestrictedUntil && new Date(r.sellingRestrictedUntil).getTime() > Date.now()),
            createdAt: r.createdAt,
            listingCount: r.listingCount,
            activeListings: r.activeListings,
            salesCount: r.salesCount,
            purchasesCount: r.purchasesCount,
            avgRating: r.avgRating == null ? null : Number(r.avgRating),
            reviewCount: r.reviewCount,
        }));

    const opayPayments = fetchAllOpayPayments();
    const refunds = fetchRefundRequests();

    return _jsxs("div", { className: "min-h-screen bg-charcoal-50/30", children: [
        _jsx(Navbar, { user }),
        _jsx("main", { className: "py-8", children: _jsx(AdminDashboard, { user, initial: { overview, listings, transactions, users, opayPayments, refunds }, initialTab }) }),
    ] });
}
