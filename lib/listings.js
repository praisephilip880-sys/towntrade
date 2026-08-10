import { db } from './db';
const LISTING_SELECT = `
  SELECT
    l.id, l.title, l.description, l.price, l.category, l.status, l.created_at AS createdAt,
    u.id AS sellerId, u.full_name AS sellerName, u.neighborhood AS sellerNeighborhood,
    u.location_verified AS sellerVerified,
    (SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.reviewee_id = u.id) AS avgRating,
    (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_id = u.id) AS reviewCount,
    (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS image
  FROM listings l
  JOIN users u ON u.id = l.user_id
`;
function rowToListing(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        price: row.price,
        category: row.category,
        status: row.status,
        createdAt: row.createdAt,
        image: row.image,
        seller: {
            id: row.sellerId,
            fullName: row.sellerName,
            neighborhood: row.sellerNeighborhood,
            locationVerified: row.sellerVerified === 1,
            avgRating: row.avgRating == null ? null : Number(row.avgRating),
            reviewCount: row.reviewCount,
        },
    };
}
/** Query listings with optional search, category filter, sort, and owner/status scoping. */
export function fetchFeedListings(opts = {}) {
    const where = [];
    const params = [];
    if (opts.status) {
        where.push('l.status = ?');
        params.push(opts.status);
    }
    if (opts.sellerId != null) {
        where.push('l.user_id = ?');
        params.push(opts.sellerId);
    }
    else {
        // Hide listings from accounts with an active selling restriction (Safety Bot).
        where.push('(u.selling_restricted_until IS NULL OR u.selling_restricted_until <= ?)');
        params.push(new Date().toISOString());
    }
    if (opts.category && opts.category !== 'all') {
        where.push('l.category = ?');
        params.push(opts.category);
    }
    const q = opts.q?.trim();
    if (q) {
        where.push('(l.title LIKE ? OR l.description LIKE ?)');
        const like = `%${q}%`;
        params.push(like, like);
    }
    let order = 'l.created_at DESC, l.id DESC';
    if (opts.sort === 'lowest')
        order = 'l.price ASC, l.id DESC';
    else if (opts.sort === 'highest')
        order = 'l.price DESC, l.id DESC';
    const sql = `${LISTING_SELECT}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${order}
    LIMIT 60`;
    return db.prepare(sql).all(...params).map(rowToListing);
}
export function fetchListingById(id) {
    const row = db.prepare(`${LISTING_SELECT} WHERE l.id = ?`).get(id);
    if (!row)
        return null;
    const images = db.prepare('SELECT data_url FROM listing_images WHERE listing_id = ? ORDER BY position ASC, id ASC').all(id).map((r) => r.data_url);
    return { ...rowToListing(row), images };
}
/** Aggregate rating + review count for a user. */
export function fetchUserRating(userId) {
    const row = db
        .prepare('SELECT ROUND(AVG(rating), 2) AS avg, COUNT(*) AS count FROM reviews WHERE reviewee_id = ?')
        .get(userId);
    return { avg: row.avg == null ? null : Number(row.avg), count: row.count };
}
/** Recent reviews written about a user. */
export function fetchReviewsForUser(userId, limit = 20) {
    const rows = db
        .prepare(`SELECT r.id, r.reviewer_id AS reviewerId, r.rating, r.comment, r.created_at AS createdAt,
              u.full_name AS reviewerName, l.title AS listingTitle
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       LEFT JOIN listings l ON l.id = r.listing_id
       WHERE r.reviewee_id = ?
       ORDER BY r.id DESC
       LIMIT ?`)
        .all(userId, limit);
    return rows;
}
/** Has this buyer already reviewed the seller for a specific listing? */
export function hasReviewed(reviewerId, revieweeId, listingId) {
    const row = db
        .prepare('SELECT 1 FROM reviews WHERE reviewer_id = ? AND reviewee_id = ? AND listing_id = ? LIMIT 1')
        .get(reviewerId, revieweeId, listingId);
    return !!row;
}
export function getReviewByListing(reviewerId, listingId) {
    return db
        .prepare('SELECT id, rating, comment FROM reviews WHERE reviewer_id = ? AND listing_id = ? LIMIT 1')
        .get(reviewerId, listingId);
}
