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
    // Device coordinates (set once at registration, updatable from the profile).
    if (typeof body.lat === 'number' && Number.isFinite(body.lat) && Math.abs(body.lat) <= 90
        && typeof body.lng === 'number' && Number.isFinite(body.lng) && Math.abs(body.lng) <= 180) {
        updates.push('lat = ?');
        params.push(body.lat);
        updates.push('lng = ?');
        params.push(body.lng);
        if (body.autoVerify === true) {
            updates.push('location_verified = ?');
            params.push(1);
        }
    }
    // Buyer/Seller hub preference.
    if (body.role === 'buyer' || body.role === 'seller' || body.role === 'both') {
        updates.push('role = ?');
        params.push(body.role);
    }
    // Browser-notification opt-in flag.
    if (typeof body.notificationsEnabled === 'boolean') {
        updates.push('notifications_enabled = ?');
        params.push(body.notificationsEnabled ? 1 : 0);
    }
    // Preferred display currency (ISO 4217 code).
    if (typeof body.currency === 'string' && /^[A-Za-z]{3}$/.test(body.currency)) {
        updates.push('currency = ?');
        params.push(body.currency.toUpperCase());
    }
    if (updates.length) {
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params, user.id);
    }
    const row = db
        .prepare('SELECT full_name, location_verified, bank_connected, avatar, role, notifications_enabled, currency FROM users WHERE id = ?')
        .get(user.id);
    return NextResponse.json({
        user: {
            ...user,
            fullName: row.full_name,
            locationVerified: row.location_verified === 1,
            bankConnected: row.bank_connected === 1,
            avatar: row.avatar ?? null,
            role: row.role ?? 'both',
            notificationsEnabled: row.notifications_enabled === 1,
            currency: row.currency ?? 'USD',
        },
    });
}
