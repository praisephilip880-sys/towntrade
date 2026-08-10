import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchFeedListings } from '@/lib/listings';
import { isCategory, isSortKey } from '@/lib/types';
import { estimateBytes, MAX_IMAGE_BYTES, MAX_IMAGES } from '@/lib/image';
export async function GET(req) {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') ?? '';
    const categoryRaw = url.searchParams.get('category');
    const sortRaw = url.searchParams.get('sort');
    const listings = fetchFeedListings({
        q,
        category: isCategory(categoryRaw) ? categoryRaw : 'all',
        sort: isSortKey(sortRaw) ? sortRaw : 'newest',
        status: 'active',
    });
    return NextResponse.json({ listings });
}
export async function POST(req) {
    const user = getCurrentUser();
    if (!user)
        return unauthorized();

    // Selling access is temporarily paused when the Safety Bot flags an account.
    const safetyRow = db.prepare('SELECT selling_restricted_until FROM users WHERE id = ?').get(user.id);
    const restrictedUntil = safetyRow?.selling_restricted_until;
    if (restrictedUntil && new Date(restrictedUntil).getTime() > Date.now()) {
        const human = new Date(restrictedUntil).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
        return NextResponse.json({
            error: `Your selling access is temporarily paused until ${human}. The TownTrade Safety Bot flagged a recent message. This restriction lifts automatically — until then you cannot post new listings.`,
        }, { status: 403 });
    }

    let body;
    try {
        body = await req.json();
    }
    catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const category = body.category;
    const images = Array.isArray(body.images) ? body.images.filter((i) => typeof i === 'string') : [];
    const price = typeof body.price === 'number' && Number.isFinite(body.price) ? body.price : 0;
    if (title.length < 3 || title.length > 100) {
        return NextResponse.json({ error: 'Title must be 3–100 characters.' }, { status: 400 });
    }
    if (description.length < 10 || description.length > 2000) {
        return NextResponse.json({ error: 'Description must be 10–2000 characters.' }, { status: 400 });
    }
    if (!isCategory(category)) {
        return NextResponse.json({ error: 'Please choose a valid category.' }, { status: 400 });
    }
    if (category === 'free') {
        // Free listings must stay free.
    }
    else if (price < 0.5 || price > 100000) {
        return NextResponse.json({ error: 'Price must be between $0.50 and $100,000.' }, { status: 400 });
    }
    if (images.length === 0) {
        return NextResponse.json({ error: 'Please add at least one photo.' }, { status: 400 });
    }
    if (images.length > MAX_IMAGES) {
        return NextResponse.json({ error: `You can add up to ${MAX_IMAGES} photos.` }, { status: 400 });
    }
    for (const img of images) {
        if (!img.startsWith('data:image/')) {
            return NextResponse.json({ error: 'One of the uploads is not a valid image.' }, { status: 400 });
        }
        if (estimateBytes(img) > MAX_IMAGE_BYTES) {
            return NextResponse.json({ error: 'One of the photos is too large (max ~1.5 MB after processing).' }, { status: 400 });
        }
    }
    const cents = category === 'free' ? 0 : Math.round(price * 100);
    const now = new Date().toISOString();
    const insert = db.transaction(() => {
        const result = db
            .prepare(`INSERT INTO listings (user_id, title, description, price, category, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`)
            .run(user.id, title, description, cents, category, now, now);
        const listingId = Number(result.lastInsertRowid);
        const insertImage = db.prepare('INSERT INTO listing_images (listing_id, data_url, position) VALUES (?, ?, ?)');
        images.forEach((img, i) => insertImage.run(listingId, img, i));
        return listingId;
    });
    const listingId = insert();
    return NextResponse.json({ listing: { id: listingId } }, { status: 201 });
}
