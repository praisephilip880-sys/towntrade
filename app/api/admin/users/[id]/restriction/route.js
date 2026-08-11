import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';


/** Admin: lift a Safety Bot selling restriction on any account. */
export async function DELETE(_req, { params }) {
    const guard = adminOnly();
    if (guard.error) {
        return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
    }
    const userRow = db.prepare('SELECT id, full_name AS fullName FROM users WHERE id = ?').get(id);
    if (!userRow)
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    db.prepare(`UPDATE users SET selling_restricted_until = NULL, selling_restricted_reason = NULL WHERE id = ?`).run(id);
    return NextResponse.json({
        user: { id: userRow.id, fullName: userRow.fullName },
        message: `Selling restriction lifted for ${userRow.fullName}.`,
    });
}
