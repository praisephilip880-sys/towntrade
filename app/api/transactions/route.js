import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
export async function GET() {
    const user = getCurrentUser();
    if (!user)
        return unauthorized();
    const rows = db
        .prepare(`SELECT
         t.id, t.listing_id AS listingId, t.amount, t.status, t.created_at AS createdAt, t.completed_at AS completedAt,
         t.buyer_id AS buyerId, t.seller_id AS sellerId,
         l.title AS listingTitle,
         (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS listingImage,
         u.full_name AS otherName
       FROM transactions t
       JOIN listings l ON l.id = t.listing_id
       JOIN users u ON u.id = CASE WHEN t.buyer_id = ? THEN t.seller_id ELSE t.buyer_id END
       WHERE t.buyer_id = ? OR t.seller_id = ?
       ORDER BY t.id DESC`)
        .all(user.id, user.id, user.id);
    const transactions = rows.map((r) => ({
        id: r.id,
        listingId: r.listingId,
        listingTitle: r.listingTitle,
        listingImage: r.listingImage,
        amount: r.amount,
        status: r.status,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        isPurchase: r.buyerId === user.id,
        otherName: r.otherName,
    }));
    return NextResponse.json({ transactions });
}
