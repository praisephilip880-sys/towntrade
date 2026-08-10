import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
const KEY_LEN = 64;
/** Hash a password with a random salt using scrypt. Stored as "salt:hash" hex. */
export function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
    return `${salt}:${hash}`;
}
/** Constant-time password verification against a stored "salt:hash" string. */
export function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash)
        return false;
    const candidate = scryptSync(password, salt, KEY_LEN);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
