import { randomBytes } from 'crypto';
import { db } from './db';

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes to answer

/** Remove expired challenges so the table never grows unbounded. */
function pruneExpired() {
    db.prepare('DELETE FROM login_challenges WHERE expires_at <= ?').run(new Date().toISOString());
}

/**
 * Issue a fresh Safety Bot challenge: a simple addition question with the
 * answer kept server-side. Returns only the public prompt; the id is the
 * single-use key the login/register route checks the answer against.
 */
export function createChallenge() {
    pruneExpired();
    const a = 2 + Math.floor(Math.random() * 9); // 2–10
    const b = 2 + Math.floor(Math.random() * 9); // 2–10
    const id = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
    db.prepare(`INSERT INTO login_challenges (id, a, b, answer, expires_at) VALUES (?, ?, ?, ?, ?)`)
        .run(id, a, b, a + b, expiresAt);
    return { id, question: `What is ${a} + ${b}?`, expiresAt };
}

/**
 * Verify the answer for a challenge id. The challenge is single-use:
 * it is deleted whether the answer is right or wrong, so a failed attempt
 * forces a fresh question.
 */
export function verifyChallenge(id, answer) {
    if (typeof id !== 'string' || !id) return false;
    pruneExpired();
    const row = db.prepare('SELECT answer, expires_at AS expiresAt FROM login_challenges WHERE id = ?').get(id);
    if (!row) return false;
    // Single-use: consume the challenge immediately.
    db.prepare('DELETE FROM login_challenges WHERE id = ?').run(id);
    if (new Date(row.expiresAt).getTime() < Date.now()) return false;
    const numeric = typeof answer === 'number' ? answer : Number(String(answer).trim());
    return Number.isFinite(numeric) && numeric === row.answer;
}
