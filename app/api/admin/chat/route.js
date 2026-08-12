import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

const CHAT_SELECT = `
  SELECT
    c.id, c.listing_id AS listingId, c.buyer_id AS buyerId, c.seller_id AS sellerId, c.updated_at AS updatedAt,
    l.title AS listingTitle, l.price AS listingPrice,
    (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS listingImage,
    u.id AS otherId, u.full_name AS otherName, u.neighborhood AS otherNeighborhood, u.location_verified AS otherVerified,
    u.is_admin AS otherIsAdmin
  FROM chats c
  JOIN listings l ON l.id = c.listing_id
  JOIN users u ON u.id = CASE WHEN c.buyer_id = ? THEN c.seller_id ELSE c.buyer_id END
`;

/** Admin starts (or reopens) a conversation with any user about a listing. */
export async function POST(req) {
  const guard = adminOnly();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const admin = guard.user;

  let body;
  try {
    body = await req.json();
  }
  catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const userId = Number(body.userId);
  const listingId = Number(body.listingId);
  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json({ error: 'Missing user or listing.' }, { status: 400 });
  }
  if (userId === admin.id) {
    return NextResponse.json({ error: 'You cannot chat with yourself.' }, { status: 400 });
  }
  const listing = db.prepare('SELECT id FROM listings WHERE id = ?').get(listingId);
  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

  // Get-or-create: the admin takes the "buyer" role in the conversation.
  let chat = db
    .prepare('SELECT id FROM chats WHERE listing_id = ? AND buyer_id = ? AND seller_id = ?')
    .get(listingId, admin.id, userId);
  if (!chat) {
    const now = new Date().toISOString();
    const result = db
      .prepare('INSERT INTO chats (listing_id, buyer_id, seller_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(listingId, admin.id, userId, now, now);
    chat = { id: Number(result.lastInsertRowid) };
  }
  const row = db.prepare(`${CHAT_SELECT} WHERE c.id = ?`).get(admin.id, chat.id);
  if (!row) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
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
      otherIsAdmin: row.otherIsAdmin === 1,
    },
  });
}
