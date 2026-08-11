import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchReviewsForUser, fetchUserRating } from '@/lib/listings';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
    }
    const row = db
        .prepare(`SELECT u.id, u.full_name AS fullName, u.neighborhood, u.location_verified AS locationVerified,
              u.created_at AS createdAt,
              (SELECT COUNT(*) FROM listings l WHERE l.user_id = u.id AND l.status = 'active') AS activeListings
       FROM users u WHERE u.id = ?`)
        .get(id);
    if (!row)
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    return NextResponse.json({
        user: {
            id: row.id,
            fullName: row.fullName,
            neighborhood: row.neighborhood,
            locationVerified: row.locationVerified === 1,
            createdAt: row.createdAt,
            activeListings: row.activeListings,
            rating: fetchUserRating(row.id),
            reviews: fetchReviewsForUser(row.id, 10),
        },
    });
}
