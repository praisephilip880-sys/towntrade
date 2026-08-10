import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
const CHAT_SELECT = `
  SELECT
    c.id, c.listing_id AS listingId, c.buyer_id AS buyerId, c.seller_id AS sellerId, c.updated_at AS updatedAt,
    l.title AS listingTitle, l.price AS listingPrice,
    (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS listingImage,
    u.id AS otherId, u.full_name AS otherName, u.neighborhood AS otherNeighborhood, u.location_verified AS otherVerified,
    (SELECT m.content FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastMessage,
    (SELECT m.created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastMessageAt
  FROM chats c
  JOIN listings l ON l.id = c.listing_id
  JOIN users u ON u.id = CASE WHEN c.buyer_id = ? THEN c.seller_id ELSE c.buyer_id END
`;
export async function GET() {
    const user = getCurrentUser();
    if (!user)
        return unauthorized();
    const rows = db
        .prepare(`${CHAT_SELECT} WHERE c.buyer_id = ? OR c.seller_id = ? ORDER BY c.updated_at DESC`)
        .all(user.id, user.id, user.id);
    const chats = rows.map((r) => ({
        id: r.id,
        listingId: r.listingId,
        listingTitle: r.listingTitle,
        listingPrice: r.listingPrice,
        listingImage: r.listingImage,
        otherId: r.otherId,
        otherName: r.otherName,
        otherNeighborhood: r.otherNeighborhood,
        otherVerified: r.otherVerified === 1,
        lastMessage: r.lastMessage,
        lastMessageAt: r.lastMessageAt,
    }));
    return NextResponse.json({ chats });
}
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
    const listingId = typeof body.listingId === 'number' && Number.isInteger(body.listingId) ? body.listingId : 0;
    const sellerId = typeof body.sellerId === 'number' && Number.isInteger(body.sellerId) ? body.sellerId : 0;
    if (listingId <= 0 || sellerId <= 0) {
        return NextResponse.json({ error: 'Missing listing or seller.' }, { status: 400 });
    }
    if (sellerId === user.id) {
        return NextResponse.json({ error: 'You cannot chat with yourself.' }, { status: 400 });
    }
    const listing = db
        .prepare('SELECT user_id AS userId FROM listings WHERE id = ?')
        .get(listingId);
    if (!listing)
        return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    if (listing.userId !== sellerId) {
        return NextResponse.json({ error: 'That seller does not own this listing.' }, { status: 400 });
    }
    // Get-or-create: one conversation per listing + buyer + seller.
    let chat = db
        .prepare('SELECT id FROM chats WHERE listing_id = ? AND buyer_id = ? AND seller_id = ?')
        .get(listingId, user.id, sellerId);
    if (!chat) {
        const now = new Date().toISOString();
        const result = db
            .prepare('INSERT INTO chats (listing_id, buyer_id, seller_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
            .run(listingId, user.id, sellerId, now, now);
        chat = { id: Number(result.lastInsertRowid) };
    }
    const row = db
        .prepare(`${CHAT_SELECT} WHERE c.id = ?`)
        .get(user.id, chat.id);
    return NextResponse.json({
        chat: {
            id: row.id,
            listingId: row.listingId,
            listingTitle: row.listingTitle,
            listingPrice: row.listingPrice,
            listingImage: row.listingImage,
            otherId: row.otherId,
            otherName: row.otherName,
            otherNeighborhood: row.otherNeighborhood,
            otherVerified: row.otherVerified === 1,
            lastMessage: row.lastMessage,
            lastMessageAt: row.lastMessageAt,
        },
    });
}
