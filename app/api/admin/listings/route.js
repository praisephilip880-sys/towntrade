import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';


/** Admin: fetch every listing (any user, any status) with the owner's details. */
export async function GET(req) {
    const guard = adminOnly();
    if (guard.error) {
        return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const statusRaw = url.searchParams.get('status');
    const status = statusRaw === 'sold' || statusRaw === 'active' ? statusRaw : 'all';
    const rows = db
        .prepare(`SELECT
         l.id, l.title, l.description, l.price, l.category, l.status, l.created_at AS createdAt,
         u.id AS sellerId, u.full_name AS sellerName, u.email AS sellerEmail, u.neighborhood AS sellerNeighborhood,
         (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS image,
         (SELECT COUNT(*) FROM transactions t WHERE t.listing_id = l.id) AS txCount
       FROM listings l
       JOIN users u ON u.id = l.user_id
       WHERE (? = '' OR l.title LIKE ? OR l.description LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)
         AND (? = 'all' OR l.status = ?)
       ORDER BY l.id DESC`)
        .all(q, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, status, status);
    const listings = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        price: r.price,
        category: r.category,
        status: r.status,
        createdAt: r.createdAt,
        image: r.image,
        txCount: r.txCount,
        seller: {
            id: r.sellerId,
            fullName: r.sellerName,
            email: r.sellerEmail,
            neighborhood: r.sellerNeighborhood,
        },
    }));
    return NextResponse.json({ listings });
}
