/**
 * Server-side Web Push (background push notifications).
 *
 * Subscriptions are saved per user; when a milestone notification is created
 * (lib/notify.js), the push is fire-and-forget delivered to every device the
 * user subscribed on — even when the site is closed. Requires the VAPID keys
 * (see .env.example). Without them, pushes are silently skipped and the app
 * keeps working exactly as before (in-app + open-tab notifications).
 */
import { db } from './db';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:praisephilip880@gmail.com';

let webpush = null;
function getWebPush() {
  if (webpush) return webpush;
  if (!PUBLIC_KEY || !PRIVATE_KEY) return null;
  try {
    // Lazy require: keeps the module side-effect free and avoids bundling the
    // package into client bundles.
    const mod = require('web-push');
    mod.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    webpush = mod;
  } catch {
    webpush = null;
  }
  return webpush;
}

/** Store (or refresh) one push subscription for a user. */
export function savePushSubscription(userId, subscription) {
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys ?? {};
  if (!endpoint || !keys.p256dh || !keys.auth) return false;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       user_id = excluded.user_id,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       last_used_at = excluded.last_used_at`
  ).run(userId, endpoint, keys.p256dh, keys.auth, now, now);
  return true;
}

/** Remove a subscription (e.g. when the user disables notifications). */
export function deletePushSubscription(userId, endpoint) {
  if (!endpoint) return 0;
  return db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').run(userId, endpoint).changes;
}

/**
 * Best-effort push to every device a user subscribed on.
 * Returns the number of pushes sent; dead subscriptions are pruned.
 */
export function sendPushToUser(userId, { title, body = '', url = '' }) {
  const w = getWebPush();
  if (!w) return 0;
  let subs = [];
  try {
    subs = db.prepare('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?').all(userId);
  } catch {
    return 0;
  }
  let sent = 0;
  for (const s of subs) {
    const payload = JSON.stringify({
      title: String(title || 'TownTrade'),
      body: String(body || ''),
      url: String(url || '/'),
      icon: '/icon.svg',
      badge: '/icon.svg',
    });
    try {
      const p = w.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
      Promise.resolve(p).catch(() => {});
      sent++;
    } catch (err) {
      // 404/410 means the browser removed the subscription — prune it.
      const status = err && (err.statusCode || err.status);
      if (status === 404 || status === 410) {
        try {
          db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(s.id);
        } catch { /* best effort */ }
      }
    }
  }
  return sent;
}
