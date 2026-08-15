import { db } from './db';
import { sendPushToUser } from './push';
import { sendWhatsAppAlert } from './whatsapp';

/** Find the platform admin's user id (the owner account that runs the dashboard). */
export function getAdminUserId() {
  const row = db.prepare('SELECT id FROM users WHERE is_admin = 1 ORDER BY id ASC LIMIT 1').get();
  return row ? row.id : null;
}

/** Milestone types that are worth a background push + WhatsApp alert. */
const MILESTONE_TYPES = new Set(['payment', 'payout', 'refund']);

/**
 * Insert a notification for one user, then deliver it as a background push
 * (works even when the site is closed) when the type is a milestone.
 */
export function notifyUser(userId, { type = 'info', title, body = '', link = '' }) {
  if (!userId) return null;
  const exists = db.prepare('SELECT id, full_name AS fullName FROM users WHERE id = ?').get(userId);
  if (!exists) return null;
  const result = db
    .prepare(`INSERT INTO notifications (user_id, type, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(userId, type, title, body, link, new Date().toISOString());
  const id = Number(result.lastInsertRowid);
  // Background push (fire-and-forget, no VAPID keys configured → no-op).
  if (MILESTONE_TYPES.has(type)) {
    sendPushToUser(userId, { title: String(title || 'TownTrade'), body, url: link || '/profile' });
  }
  return id;
}

/** Notify the platform admin (no-op until the owner account exists). */
export function notifyAdmin(payload) {
  const adminId = getAdminUserId();
  const inserted = notifyUser(adminId, payload);
  // WhatsApp milestone alerts to the admin's phone (Twilio sandbox).
  if (inserted && payload && MILESTONE_TYPES.has(payload.type)) {
    const text = `🏘️ TownTrade ${payload.type === 'refund' ? '↩️' : payload.type === 'payout' ? '💸' : '💰'} ${payload.title}\n${payload.body || ''}\n\nReply in the app → ${payload.link || '/admin'}`;
    sendWhatsAppAlert(text);
  }
  return inserted;
}

/** Number of unread notifications for a user. */
export function unreadCount(userId) {
  return db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0').get(userId).n;
}

/** A user's notifications, newest first. */
export function listNotifications(userId, limit = 30) {
  return db
    .prepare('SELECT id, type, title, body, link, read, created_at AS createdAt FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?')
    .all(userId, limit);
}

/** Mark one (or all) notifications read. */
export function markRead(userId, { id = null, all = false } = {}) {
  if (all) {
    return db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId).changes;
  }
  if (id) {
    return db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND id = ?').run(userId, id).changes;
  }
  return 0;
}
