import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET() {
    const user = getCurrentUser();
    if (!user)
        return unauthorized();
    return NextResponse.json({ user });
}
export async function PATCH(req) {
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
    const updates = [];
    const params = [];
    if (body.locationVerified === true) {
        updates.push('location_verified = ?');
        params.push(1);
    }
    if (typeof body.avatar === 'string' && body.avatar.startsWith('data:image/')) {
        // Compressed client-side; cap the stored size to keep the DB light.
        if (body.avatar.length < 1_200_000) {
            updates.push('avatar = ?');
            params.push(body.avatar);
        }
    }
    if (updates.length) {
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params, user.id);
    }
    const row = db
        .prepare('SELECT full_name, location_verified, bank_connected, avatar FROM users WHERE id = ?')
        .get(user.id);
    return NextResponse.json({
        user: {
            ...user,
            fullName: row.full_name,
            locationVerified: row.location_verified === 1,
            bankConnected: row.bank_connected === 1,
            avatar: row.avatar ?? null,
        },
    });
}
