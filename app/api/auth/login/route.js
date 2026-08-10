import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { verifyChallenge } from '@/lib/challenge';
import { recordLoginEvent } from '@/lib/community';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
export async function POST(req) {
    let body;
    try {
        body = await req.json();
    }
    catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) {
        return NextResponse.json({ error: 'Please enter your email and password.' }, { status: 400 });
    }
    // Safety Bot human check (placeholder security, replaced later).
    if (!verifyChallenge(body.challengeId, body.answer)) {
        return NextResponse.json({ error: 'Wrong answer to the Safety Bot check. Please try again with a new question.' }, { status: 400 });
    }
    const row = db
        .prepare('SELECT id, full_name, password_hash FROM users WHERE email = ?')
        .get(email);
    if (!row || !verifyPassword(password, row.password_hash)) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }
    createSession(row.id);
    recordLoginEvent(row.id, 'signin');
    return NextResponse.json({ user: { id: row.id, fullName: row.full_name } });
}
