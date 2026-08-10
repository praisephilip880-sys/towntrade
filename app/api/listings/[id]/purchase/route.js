import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchListingById } from '@/lib/listings';
export async function POST(_req, { params }) {
    const user = getCurrentUser();
    if (!user)
        return unauthorized();
    const id = Number(params.id);
    const listing = Number.isInteger(id) ? fetchListingById(id) : null;
    if (!listing)
        return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    if (listing.seller.id === user.id) {
        return NextResponse.json({ error: 'You cannot buy your own listing.' }, { status: 400 });
    }
    if (listing.status !== 'active') {
        return NextResponse.json({ error: 'This listing has already been sold.' }, { status: 400 });
    }
    const now = new Date().toISOString();
    // Free listings complete instantly; paid listings enter escrow hold.
    const status = listing.price > 0 ? 'escrow_hold' : 'completed';
    const purchase = db.transaction(() => {
        db.prepare(`UPDATE listings SET status = 'sold', updated_at = ? WHERE id = ?`).run(now, id);
        const result = db
            .prepare(`INSERT INTO transactions (listing_id, buyer_id, seller_id, amount, status, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(id, user.id, listing.seller.id, listing.price, status, now, status === 'completed' ? now : null);
        return Number(result.lastInsertRowid);
    });
    const transactionId = purchase();
    return NextResponse.json({
        transaction: { id: transactionId, status },
        message: status === 'escrow_hold'
            ? 'Payment successful — your item is now held in escrow.'
            : 'Claimed! Free items complete instantly — no payment needed.',
    });
}
