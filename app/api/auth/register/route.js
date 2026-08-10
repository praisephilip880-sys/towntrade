import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { verifyChallenge } from '@/lib/challenge';
import { recordLoginEvent } from '@/lib/community';
import { db, grantOwnerAdmin, purgeDemoIfOverLimit } from '@/lib/db';
import { hashPassword } from '@/lib/password';
export async function POST(req) {
    let body;
    try {
        body = await req.json();
    }
    catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const neighborhood = typeof body.neighborhood === 'string' ? body.neighborhood.trim() : '';
    const locationVerified = body.locationVerified === true;
    // Safety Bot human check (placeholder security, replaced later).
    if (!verifyChallenge(body.challengeId, body.answer)) {
        return NextResponse.json({ error: 'Wrong answer to the Safety Bot check. Please try again with a new question.' }, { status: 400 });
    }
    if (fullName.length < 2 || fullName.length > 80) {
        return NextResponse.json({ error: 'Please enter your full name (2–80 characters).' }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 120) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (password.length < 6 || password.length > 128) {
        return NextResponse.json({ error: 'Password must be 6–128 characters.' }, { status: 400 });
    }
    if (neighborhood.length < 2 || neighborhood.length > 80) {
        return NextResponse.json({ error: 'Please enter your neighborhood name.' }, { status: 400 });
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists. Try signing in.' }, { status: 409 });
    }
    const result = db
        .prepare(`INSERT INTO users (full_name, email, password_hash, neighborhood, location_verified, bank_connected, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`)
        .run(fullName, email, hashPassword(password), neighborhood, locationVerified ? 1 : 0, new Date().toISOString());
    const userId = Number(result.lastInsertRowid);

    // Growing community: once registered users pass the threshold, demo
    // accounts and listings are removed automatically.
    purgeDemoIfOverLimit();

    // If the platform owner registers, they get admin powers immediately.
    grantOwnerAdmin();

    recordLoginEvent(userId, 'signup');
    createSession(userId);
    const row = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId);
    return NextResponse.json({ user: { id: userId, fullName: row.full_name } }, { status: 201 });
}
