import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';


/** Admin: fetch every transaction with the listing, buyer and seller details. */
export async function GET(req) {
    const guard = adminOnly();
    if (guard.error) {
        return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const rows = db
        .prepare(`SELECT
         t.id, t.amount, t.status, t.created_at AS createdAt, t.completed_at AS completedAt,
         t.listing_id AS listingId, l.title AS listingTitle, l.category AS listingCategory,
         (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS listingImage,
         b.id AS buyerId, b.full_name AS buyerName, b.email AS buyerEmail,
         s.id AS sellerId, s.full_name AS sellerName, s.email AS sellerEmail
       FROM transactions t
       JOIN listings l ON l.id = t.listing_id
       JOIN users b ON b.id = t.buyer_id
       JOIN users s ON s.id = t.seller_id
       WHERE (? = 'all' OR t.status = ?)
       ORDER BY t.id DESC`)
        .all(status === 'escrow_hold' ? 'escrow_hold' : status === 'completed' ? 'completed' : 'all', status === 'escrow_hold' ? 'escrow_hold' : status === 'completed' ? 'completed' : 'all');
    const transactions = rows.map((r) => ({
        id: r.id,
        listingId: r.listingId,
        listingTitle: r.listingTitle,
        listingCategory: r.listingCategory,
        listingImage: r.listingImage,
        amount: r.amount,
        status: r.status,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        buyer: { id: r.buyerId, fullName: r.buyerName, email: r.buyerEmail },
        seller: { id: r.sellerId, fullName: r.sellerName, email: r.sellerEmail },
        fee: Math.round(r.amount * 0.05),
        payout: r.amount - Math.round(r.amount * 0.05),
    }));
    return NextResponse.json({ transactions });
}
