import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';


export async function GET() {
    const guard = adminOnly();
    if (guard.error) {
        return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
    const totalUsers = db.prepare('SELECT COUNT(*) AS n FROM users WHERE id > 0').get().n;
    const restrictedUsers = db
        .prepare('SELECT COUNT(*) AS n FROM users WHERE id > 0 AND selling_restricted_until IS NOT NULL AND selling_restricted_until > ?')
        .get(new Date().toISOString()).n;
    const totalListings = db.prepare('SELECT COUNT(*) AS n FROM listings').get().n;
    const activeListings = db.prepare("SELECT COUNT(*) AS n FROM listings WHERE status = 'active'").get().n;
    const soldListings = db.prepare("SELECT COUNT(*) AS n FROM listings WHERE status = 'sold'").get().n;
    const totalTransactions = db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n;
    const escrowHold = db.prepare("SELECT COUNT(*) AS n FROM transactions WHERE status = 'escrow_hold'").get().n;
    const completed = db.prepare("SELECT COUNT(*) AS n FROM transactions WHERE status = 'completed'").get().n;
    const escrowValue = db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE status = 'escrow_hold'").get().s;
    const completedValue = db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE status = 'completed'").get().s;
    const platformFees = Math.round(completedValue * 0.05);
    const reviews = db.prepare('SELECT COUNT(*) AS n FROM reviews').get().n;
    const chats = db.prepare('SELECT COUNT(*) AS n FROM chats').get().n;
    const safetyEvents = db.prepare('SELECT COUNT(*) AS n FROM safety_events').get().n;
    return NextResponse.json({
        overview: {
            totalUsers,
            restrictedUsers,
            totalListings,
            activeListings,
            soldListings,
            totalTransactions,
            escrowHold,
            completed,
            escrowValue,
            completedValue,
            platformFees,
            reviews,
            chats,
            safetyEvents,
        },
    });
}
