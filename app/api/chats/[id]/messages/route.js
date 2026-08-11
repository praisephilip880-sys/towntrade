import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
import { analyzeMessage, botReplyFor, BOT_USER_ID, RESTRICTION_HOURS } from '@/lib/safety';
export const dynamic = 'force-dynamic';

function isParticipant(chatId, userId) {
    const row = db
        .prepare('SELECT id FROM chats WHERE id = ? AND (buyer_id = ? OR seller_id = ?)')
        .get(chatId, userId, userId);
    return !!row;
}
export async function GET(_req, { params }) {
    const user = getCurrentUser();
    if (!user)
        return unauthorized();
    const chatId = Number(params.id);
    if (!Number.isInteger(chatId) || chatId <= 0 || !isParticipant(chatId, user.id)) {
        return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }
    const messages = db
        .prepare(`SELECT id, chat_id AS chatId, sender_id AS senderId, content, created_at AS createdAt
       FROM messages WHERE chat_id = ? ORDER BY id ASC`)
        .all(chatId);
    return NextResponse.json({ messages });
}
export async function POST(req, { params }) {
    const user = getCurrentUser();
    if (!user)
        return unauthorized();
    const chatId = Number(params.id);
    if (!Number.isInteger(chatId) || chatId <= 0 || !isParticipant(chatId, user.id)) {
        return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }
    let body;
    try {
        body = await req.json();
    }
    catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content)
        return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    if (content.length > 2000)
        return NextResponse.json({ error: 'Message is too long (max 2000 characters).' }, { status: 400 });

    /* ------------------------- Safety Bot scan ------------------------- */
    const analysis = analyzeMessage(content);
    if (analysis.flagged) {
        const now = new Date().toISOString();
        const until = new Date(Date.now() + RESTRICTION_HOURS * 60 * 60 * 1000).toISOString();
        const botContent = botReplyFor(analysis.categories);

        // Atomic: bot warning + chat bump + safety event + restriction commit together.
        const applyViolation = db.transaction(() => {
            const botResult = db
                .prepare('INSERT INTO messages (chat_id, sender_id, content, created_at) VALUES (?, ?, ?, ?)')
                .run(chatId, BOT_USER_ID, botContent, now);
            db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(now, chatId);

            // Note: the sensitive message text is never persisted.
            db.prepare(`
                INSERT INTO safety_events (user_id, chat_id, category, snippet, action, created_at)
                VALUES (?, ?, ?, '', 'blocked_and_restricted', ?)
            `).run(user.id, chatId, analysis.primary, now);

            db.prepare(`
                UPDATE users
                SET safety_flags = safety_flags + 1,
                    selling_restricted_until = ?,
                    selling_restricted_reason = ?
                WHERE id = ?
            `).run(until, analysis.primary, user.id);
            return Number(botResult.lastInsertRowid);
        });

        const botMessageId = applyViolation();

        return NextResponse.json({
            blocked: true,
            reason: analysis.label,
            message: `Your message was blocked by the TownTrade Safety Bot because it contains ${analysis.label}. Sharing payment or contact details is not allowed on TownTrade. Selling access is paused for ${RESTRICTION_HOURS} hours.`,
            botMessage: {
                id: botMessageId,
                chatId,
                senderId: BOT_USER_ID,
                content: botContent,
                createdAt: now,
            },
            restriction: { until },
        });
    }

    /* --------------------------- normal message -------------------------- */
    const now = new Date().toISOString();
    const result = db
        .prepare('INSERT INTO messages (chat_id, sender_id, content, created_at) VALUES (?, ?, ?, ?)')
        .run(chatId, user.id, content, now);
    db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(now, chatId);
    return NextResponse.json({
        message: {
            id: Number(result.lastInsertRowid),
            chatId,
            senderId: user.id,
            content,
            createdAt: now,
        },
    });
}
