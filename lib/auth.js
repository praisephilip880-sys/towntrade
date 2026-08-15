import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { db } from './db';
import { SESSION_COOKIE } from './constants';
export { SESSION_COOKIE };
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
function toSessionUser(row) {
    return {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        neighborhood: row.neighborhood,
        locationVerified: row.location_verified === 1,
        bankConnected: row.bank_connected === 1,
        avatar: row.avatar ?? null,
        isAdmin: row.is_admin === 1,
        safetyFlags: row.safety_flags ?? 0,
        sellingRestrictedUntil: row.selling_restricted_until ?? null,
        role: row.role ?? 'both',
        lat: row.lat ?? null,
        lng: row.lng ?? null,
        notificationsEnabled: row.notifications_enabled === 1,
        currency: row.currency ?? 'USD',
        createdAt: row.created_at,
    };
}
/** Create a DB-backed session and set the httpOnly cookie. */
export function createSession(userId) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, new Date().toISOString(), expiresAt);
    cookies().set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_TTL_MS / 1000,
    });
}
/** Resolve the current session user, or null when unauthenticated/expired. */
export function getCurrentUser() {
    const token = cookies().get(SESSION_COOKIE)?.value;
    if (!token)
        return null;
    const row = db
        .prepare(`       SELECT u.id, u.full_name, u.email, u.neighborhood, u.location_verified, u.bank_connected, u.avatar, u.is_admin, u.safety_flags, u.selling_restricted_until, u.role, u.lat, u.lng, u.notifications_enabled, u.currency, u.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`)
        .get(token);
    if (!row)
        return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        return null;
    }
    return toSessionUser(row);
}
/** Server-component guard: redirect to the landing page's auth modal when logged out. */
export function requireUser() {
    const user = getCurrentUser();
    if (!user)
        redirect('/#auth');
    return user;
}
/** Server-component guard: only admins may pass, otherwise redirect to the marketplace. */
export function requireAdmin() {
    const user = requireUser();
    if (!user.isAdmin)
        redirect('/marketplace');
    return user;
}
/** API guard: 401 when logged out, 403 when the account is not an admin. */
export function adminOnly() {
    const user = getCurrentUser();
    if (!user)
        return { error: 'Not authenticated', status: 401 };
    if (!user.isAdmin)
        return { error: 'Admin access required.', status: 403 };
    return { user };
}
/** Destroy the current session and clear the cookie. */
export function destroySession() {
    const token = cookies().get(SESSION_COOKIE)?.value;
    if (token) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    cookies().set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}
/** Standard 401 JSON response for API routes. */
export function unauthorized() {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}
