import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchListingById } from '@/lib/listings';
import { isCategory } from '@/lib/types';
import { estimateBytes, MAX_IMAGE_BYTES, MAX_IMAGES } from '@/lib/image';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
    const id = Number(params.id);
    const listing = Number.isInteger(id) ? fetchListingById(id) : null;
    if (!listing)
        return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    return NextResponse.json({ listing });
}
export async function PUT(req, { params }) {
    const user = getCurrentUser();
    if (!user)
        return unauthorized();
    const id = Number(params.id);
    const listing = Number.isInteger(id) ? fetchListingById(id) : null;
    if (!listing)
        return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    if (listing.seller.id !== user.id && !user.isAdmin) {
        return NextResponse.json({ error: 'You can only edit your own listings.' }, { status: 403 });
    }

    // Restricted sellers cannot edit (re-list) items either.
    const safetyRow = db.prepare('SELECT selling_restricted_until FROM users WHERE id = ?').get(user.id);
    if (safetyRow?.selling_restricted_until && new Date(safetyRow.selling_restricted_until).getTime() > Date.now()) {
        return NextResponse.json({ error: 'Selling access is temporarily paused on your account — you cannot edit or re-list items until the restriction lifts.' }, { status: 403 });
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
    // The client always sends the price as USD cents (it converts the seller's
    // chosen currency). Do NOT multiply by 100 here — that was the bug that
    // stored $20 listings as $2,000 and rejected large local-currency prices.
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
    if (category !== 'free' && (price < 50 || price > 10000000)) {
        return NextResponse.json({ error: 'Price must be between $0.50 and $100,000 USD.' }, { status: 400 });
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
            return NextResponse.json({ error: 'One of the photos is too large (max ~3 MB after processing).' }, { status: 400 });
        }
    }
    const cents = category === 'free' ? 0 : Math.round(price);
    const now = new Date().toISOString();
    const update = db.transaction(() => {
        db.prepare(`UPDATE listings SET title = ?, description = ?, price = ?, category = ?, updated_at = ? WHERE id = ?`).run(title, description, cents, category, now, id);
        db.prepare('DELETE FROM listing_images WHERE listing_id = ?').run(id);
        const insertImage = db.prepare('INSERT INTO listing_images (listing_id, data_url, position) VALUES (?, ?, ?)');
        images.forEach((img, i) => insertImage.run(id, img, i));
    });
    update();
    return NextResponse.json({ listing: { id } });
}
export async function DELETE(_req, { params }) {
    const user = getCurrentUser();
    if (!user)
        return unauthorized();
    const id = Number(params.id);
    const listing = Number.isInteger(id) ? fetchListingById(id) : null;
    if (!listing)
        return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    if (listing.seller.id !== user.id && !user.isAdmin) {
        return NextResponse.json({ error: 'You can only delete your own listings.' }, { status: 403 });
    }
    db.prepare('DELETE FROM listings WHERE id = ?').run(id);
    return NextResponse.json({ ok: true });
}
