import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function POST(req) {
    const user = getCurrentUser();
    if (!user)
        return unauthorized();
    let body;
    try {
        body = await req.json();
    }
    catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    const revieweeId = typeof body.revieweeId === 'number' && Number.isInteger(body.revieweeId) ? body.revieweeId : 0;
    const listingId = typeof body.listingId === 'number' && Number.isInteger(body.listingId) ? body.listingId : null;
    const rating = typeof body.rating === 'number' ? Math.round(body.rating) : 0;
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 500) : '';
    if (revieweeId <= 0 || revieweeId === user.id) {
        return NextResponse.json({ error: 'You cannot review yourself.' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5 stars.' }, { status: 400 });
    }
    const reviewee = db.prepare('SELECT id FROM users WHERE id = ?').get(revieweeId);
    if (!reviewee)
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (listingId != null) {
        const listing = db.prepare('SELECT user_id AS userId, status FROM listings WHERE id = ?').get(listingId);
        if (!listing)
            return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
        if (listing.userId !== revieweeId) {
            return NextResponse.json({ error: 'This user is not the seller of that listing.' }, { status: 400 });
        }
        const completed = db
            .prepare(`SELECT 1 FROM transactions
         WHERE listing_id = ? AND buyer_id = ? AND seller_id = ? AND status = 'completed'
         LIMIT 1`)
            .get(listingId, user.id, revieweeId);
        if (!completed) {
            return NextResponse.json({ error: 'You can only review a seller after completing a transaction for this listing.' }, { status: 400 });
        }
        const existing = db
            .prepare('SELECT id FROM reviews WHERE reviewer_id = ? AND listing_id = ?')
            .get(user.id, listingId);
        if (existing) {
            return NextResponse.json({ error: 'You have already reviewed this listing.' }, { status: 409 });
        }
    }
    const result = db
        .prepare('INSERT INTO reviews (listing_id, reviewer_id, reviewee_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(listingId, user.id, revieweeId, rating, comment, new Date().toISOString());
    return NextResponse.json({ review: { id: Number(result.lastInsertRowid), rating, comment } }, { status: 201 });
}
