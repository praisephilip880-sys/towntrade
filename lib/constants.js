/**
 * Dependency-free constants shared across the Edge middleware and the Node runtime.
 * Keep this module free of any Node/server-only imports (e.g. better-sqlite3).
 */
export const SESSION_COOKIE = 'tt_session';

/* --------------------------- platform identity --------------------------- */

/** The TownTrade platform owner: receives admin powers + OPay payments. */
export const OWNER_EMAIL = 'praisephilip880@gmail.com';

/* --------------------------- local (OPay) payments ----------------------- */

/**
 * The platform's OPay account. Buyers who cannot pay by card transfer the
 * Naira equivalent here, then the platform pays the seller from the same
 * account once delivery is confirmed. (Nigeria phone number format.)
 */
export const OPAY_ACCOUNT_NUMBER = '8121344178';
export const OPAY_BANK = 'OPay';
export const OPAY_ACCOUNT_NAME = 'Mberekpe Praise Chineamerem';

/** Approximate exchange rate used only to display the Naira estimate to buyers. */
export const NGN_PER_USD = 1600;

/** Platform fee on every completed sale (5%), the rest goes to the seller. */
export const PLATFORM_FEE_RATE = 0.05;

/* -------------------------------- support ------------------------------- */

/** WhatsApp number in international format (0812 134 4178 → +234…). */
export const WHATSAPP_NUMBER = '2348121344178';
export const SUPPORT_EMAIL = OWNER_EMAIL;

/** Build a wa.me deep link with a pre-filled message. */
export function whatsappLink(message = '') {
  const text = encodeURIComponent(message || 'Hi TownTrade Support! I need help with something on the marketplace.');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}
