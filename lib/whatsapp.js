/**
 * WhatsApp milestone alerts (Twilio WhatsApp Sandbox).
 *
 * Sends a WhatsApp message to the platform admin (ADMIN_WHATSAPP_TO) whenever
 * a payment milestone happens — buyer paid, delivery confirmed, payout sent,
 * refund requested/approved. Powered by Twilio's Messaging API. If the Twilio
 * credentials are not configured yet, this is a silent no-op so the app keeps
 * working; the milestone still lands in the in-app notification feed.
 */
const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const TO = process.env.ADMIN_WHATSAPP_TO || 'whatsapp:+2348121344178';

let configured = null;
function isConfigured() {
  if (configured !== null) return configured;
  configured = Boolean(SID && TOKEN && FROM && TO);
  return configured;
}

/**
 * Send one WhatsApp alert to the admin. Fire-and-forget; never throws.
 * @returns {Promise<boolean>} true when a message was actually sent.
 */
export async function sendWhatsAppAlert(text) {
  if (!isConfigured()) return false;
  const message = String(text || '').slice(0, 1400);
  if (!message) return false;
  try {
    // Lazy require: keeps the module light when Twilio is not used.
    const twilio = require('twilio');
    const client = twilio(SID, TOKEN);
    await client.messages.create({ from: FROM, to: TO, body: message });
    return true;
  } catch (err) {
    console.error('[TownTrade] WhatsApp alert failed:', String((err && err.message) || err).slice(0, 200));
    return false;
  }
}
