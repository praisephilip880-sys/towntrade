import { db } from './db';

/** Real, database-backed community numbers for the landing page. */
export function fetchCommunityStats() {
    const listings = db.prepare('SELECT COUNT(*) AS n FROM listings').get().n;
    const verifiedNeighbors = db.prepare('SELECT COUNT(*) AS n FROM users WHERE id > 0 AND location_verified = 1').get().n;
    const tradesCompleted = db.prepare("SELECT COUNT(*) AS n FROM transactions WHERE status = 'completed'").get().n;
    // Money that actually moved between neighbors (completed escrow volume, in cents).
    const localEconomy = db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM transactions WHERE status = 'completed'").get().s;
    // Platform revenue = 5% fee on completed trades.
    const revenue = Math.round(localEconomy * 0.05);
    return { listings, verifiedNeighbors, tradesCompleted, localEconomy, revenue };
}

/** Record a successful sign-in or sign-up for the community board. */
export function recordLoginEvent(userId, eventType = 'signin') {
    db.prepare(`INSERT INTO login_events (user_id, event_type, created_at) VALUES (?, ?, ?)`)
        .run(userId, eventType, new Date().toISOString());
}

/**
 * Live board data: recent sign-ins/sign-ups and revenue-per-day over the
 * last N days (platform fee = 5% of completed transaction amounts).
 */
export function fetchPulse(days = 14) {
    // node:sqlite rows have a null prototype — spread into plain objects so
    // Next.js can serialize them into client components.
    const recent = db
        .prepare(`SELECT e.id, e.event_type AS eventType, e.created_at AS createdAt,
              u.id AS userId, u.full_name AS fullName, u.neighborhood
       FROM login_events e
       JOIN users u ON u.id = e.user_id
       ORDER BY e.id DESC
       LIMIT 12`)
        .all()
        .map((r) => ({ ...r }));

    // Build a day bucket for each of the last `days` days (local dates).
    const buckets = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        buckets.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), iso: d.toISOString(), start: d.getTime(), value: 0 });
    }
    const rows = db
        .prepare(`SELECT completed_at AS completedAt, amount FROM transactions WHERE status = 'completed' AND completed_at IS NOT NULL`)
        .all();
    for (const r of rows) {
        const t = new Date(r.completedAt).getTime();
        const b = buckets.find((x) => t >= x.start && t < x.start + 24 * 60 * 60 * 1000);
        if (b) b.value += Math.round(r.amount * 0.05); // 5% platform fee
    }

    // All-time platform revenue = 5% of every completed transaction (not just the window).
    const totalRevenue = Math.round(rows.reduce((sum, r) => sum + r.amount, 0) * 0.05);

    return { recent, series: buckets, totalRevenue };
}
