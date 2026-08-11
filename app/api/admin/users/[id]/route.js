import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';


/**
 * Admin: permanently delete a user account and ALL of their data.
 * Foreign-key cascades remove their sessions, listings, images, chats,
 * messages, transactions, reviews and safety events.
 */
export async function DELETE(_req, { params }) {
    const guard = adminOnly();
    if (guard.error) {
        return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
    }
    const userRow = db.prepare('SELECT id, full_name AS fullName, email, is_admin AS isAdmin FROM users WHERE id = ?').get(id);
    if (!userRow)
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    // Guard rails: you can't delete your own admin account or another admin's.
    if (id === guard.user.id) {
        return NextResponse.json({ error: 'You cannot delete your own admin account.' }, { status: 400 });
    }
    if (userRow.isAdmin === 1) {
        return NextResponse.json({ error: 'Admin accounts cannot be deleted. Remove admin status first.' }, { status: 400 });
    }

    // Never destroy money: refuse deletion while funds are locked in escrow.
    const escrowHold = db
        .prepare(`SELECT COUNT(*) AS n FROM transactions WHERE (buyer_id = ? OR seller_id = ?) AND status = 'escrow_hold'`)
        .get(id, id).n;
    if (escrowHold > 0) {
        return NextResponse.json({
            error: `This account has ${escrowHold} transaction(s) held in escrow. Refund or release them first, then delete the account.`,
        }, { status: 400 });
    }

    const counts = db.transaction(() => {
        const stats = {
            listings: db.prepare('SELECT COUNT(*) AS n FROM listings WHERE user_id = ?').get(id).n,
            transactions: db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE buyer_id = ? OR seller_id = ?').get(id, id).n,
            reviews: db.prepare('SELECT COUNT(*) AS n FROM reviews WHERE reviewer_id = ? OR reviewee_id = ?').get(id, id).n,
            chats: db.prepare('SELECT COUNT(*) AS n FROM chats WHERE buyer_id = ? OR seller_id = ?').get(id, id).n,
            safetyEvents: db.prepare('SELECT COUNT(*) AS n FROM safety_events WHERE user_id = ?').get(id).n,
            sessions: db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(id).n,
        };
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return stats;
    });
    const stats = counts();
    return NextResponse.json({
        deleted: { id, fullName: userRow.fullName, email: userRow.email },
        message: `Account “${userRow.fullName}” (${userRow.email}) deleted along with ${stats.listings} listing(s), ${stats.transactions} transaction(s), ${stats.reviews} review(s), ${stats.chats} chat(s), ${stats.safetyEvents} safety event(s) and ${stats.sessions} session(s).`,
    });
}
