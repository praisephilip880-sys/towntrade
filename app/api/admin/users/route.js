import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';


/** Admin: fetch every registered user (excludes the Safety Bot) with marketplace stats. */
export async function GET(req) {
    const guard = adminOnly();
    if (guard.error) {
        return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const rows = db
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
       FROM users u
       WHERE u.id > 0 AND (? = '' OR u.full_name LIKE ? OR u.email LIKE ? OR u.neighborhood LIKE ?)
       ORDER BY u.id ASC`)
        .all(q, `%${q}%`, `%${q}%`, `%${q}%`);
    const users = rows.map((r) => ({
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
    return NextResponse.json({ users });
}
