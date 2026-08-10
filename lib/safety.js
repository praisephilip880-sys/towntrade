/**
 * TownTrade Safety Bot — scam & sensitive-content detection.
 *
 * Pure JavaScript, safe to import from both the server and client bundles
 * (no Node-only dependencies). Database mutations live in the API routes.
 */

/** Sender id used by the Safety Bot in chat threads. */
export const BOT_USER_ID = 0;
export const SAFETY_BOT_NAME = 'TownTrade Safety Bot';

/** How long selling access is paused after a violation. */
export const RESTRICTION_HOURS = 24;

export const CATEGORY_LABELS = {
  card: 'credit card details',
  bank: 'bank or account details',
  phone: 'a phone number',
  offplatform: 'an off-platform payment request',
  suspicious: 'scam-like language',
};

/* ------------------------------- detectors ------------------------------ */

function luhnValid(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Find long digit sequences (with spaces/dashes) — card candidates. */
function findCard(text) {
  const keywordHit = /\b(credit card|card number|cvv|cvc|expiry|expiration|visa|mastercard|amex|american express)\b/i.test(text);
  const candidates = text.match(/(?:\d[ -]?){12,19}(?!\d)/g) ?? [];
  for (const raw of candidates) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) {
      return true;
    }
  }
  // "card number" + a nearby 4+ digit group (or 3-digit cvv) also counts.
  if (keywordHit && /\b\d{4,}\b/.test(text)) return true;
  if (/\bcvv|cvc\b/i.test(text) && /\b\d{3}\b/.test(text)) return true;
  return false;
}

function findBank(text) {
  const keywords =
    /\b(account number|routing number|iban|sort code|bank account|bank details|deposit into|deposit to|send to this account|wire to|direct deposit|bank card|debit card number)\b/i;
  if (keywords.test(text)) return true;
  // Bare long digit runs (12+ digits) that aren't a valid card.
  // Intentional aggressiveness: order numbers/timestamps can match, per spec.
  const runs = text.match(/\b\d{12,17}\b/g) ?? [];
  for (const run of runs) {
    if (!luhnValid(run)) return true;
  }
  return false;
}

function findPhone(text) {
  const keywordHit = /\b(call me|text me|whatsapp|phone number|my number|mobile number|contact me at|reach me at|call or text|number is|dm me)\b/i.test(text);
  const explicit = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/.test(text);
  if (explicit) return true;
  if (keywordHit && /\d{7,}/.test(text)) return true;
  return false;
}

function findOffPlatform(text) {
  return /\b(paypal|zelle|venmo|cash ?app|western union|moneygram|wire transfer|outside (the )?app|off the app|outside the platform|send money outside)\b/i.test(text);
}

function findSuspicious(text) {
  // Deliberately aggressive per spec ("any form of scam"): phrases like "gift card"
  // or bare 12+ digit runs can occasionally false-positive on legit content.
  return /\b(kindly|gift card|itunes card|google play card|otp|verification code|clearance fee|advance fee|release fee|urgent payment)\b/i.test(text);
}

/**
 * Scan a chat message for scam/sensitive content.
 * @returns {{ flagged: boolean, categories: string[], primary: string|null, label: string|null }}
 */
export function analyzeMessage(text) {
  const categories = [];
  if (findCard(text)) categories.push('card');
  if (findBank(text)) categories.push('bank');
  if (findPhone(text)) categories.push('phone');
  if (findOffPlatform(text)) categories.push('offplatform');
  if (findSuspicious(text)) categories.push('suspicious');

  const flagged = categories.length > 0;
  const primary = flagged ? categories[0] : null;
  return {
    flagged,
    categories,
    primary,
    label: flagged ? CATEGORY_LABELS[primary] : null,
  };
}

/** The message the Safety Bot posts into a chat when content is blocked. */
export function botReplyFor(categories) {
  const labels = [...new Set(categories)].map((c) => CATEGORY_LABELS[c] ?? 'sensitive information');
  const list = labels.length === 1 ? labels[0] : labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
  return (
    `⚠️ Safety alert from TownTrade Safety Bot\n\n` +
    `A message in this conversation was blocked because it appeared to contain ${list}.\n\n` +
    `Sharing card numbers, bank/account details, or personal phone numbers puts both neighbors at risk. ` +
    `Keep every conversation and every payment inside TownTrade — escrow protects both sides.\n\n` +
    `The sender's selling access has been temporarily paused for ${RESTRICTION_HOURS} hours while our team reviews. ` +
    `The restriction lifts automatically.`
  );
}

/* ------------------------- safety assistant FAQ ------------------------- */

export const FAQ = [
  {
    q: 'Is it safe to share my card or bank details?',
    keywords: ['card', 'credit', 'cvv', 'bank', 'account', 'routing'],
    answer:
      'Never share credit card, bank account, or routing numbers in chat — the Safety Bot blocks them automatically. All payments on TownTrade happen through escrow inside the app, so no one ever needs your financial details.',
  },
  {
    q: 'How does escrow protect me?',
    keywords: ['escrow', 'pay', 'payment', 'money', 'safe', 'protect'],
    answer:
      'When you hit Buy Now, your funds are held in TownTrade escrow. The seller only receives 95% after you confirm delivery, and TownTrade keeps a 5% platform fee. Neither side can be cheated.',
  },
  {
    q: 'Can I share my phone number?',
    keywords: ['phone', 'number', 'call', 'whatsapp', 'contact'],
    answer:
      'Sharing phone numbers is flagged by the Safety Bot. Keep all communication inside TownTrade chat so both neighbors stay protected and conversations are on record.',
  },
  {
    q: 'What happens if I get flagged?',
    keywords: ['flag', 'blocked', 'restrict', 'ban', 'warning', 'paused'],
    answer:
      'If a message is blocked, the Safety Bot logs the event and pauses your selling access for 24 hours. The restriction lifts automatically. Keep trading in-app and avoid sensitive details and it will not happen again.',
  },
  {
    q: 'How do I report a scammer?',
    keywords: ['report', 'scam', 'scammer', 'fraud', 'suspicious'],
    answer:
      "The Safety Bot watches every conversation automatically. If someone asks you to pay outside the app or share a code, do not reply — end the chat and email support@towntrade.local with the listing name.",
  },
];

const DEFAULT_ANSWER =
  'I keep an eye on every conversation for card numbers, bank details, phone numbers, and off-platform payment requests — anything sensitive gets blocked and flagged. ' +
  'Try asking me “How does escrow protect me?” or “What happens if I get flagged?” for more detail.';

/** Rule-based chatbot reply for the Safety Assistant widget. */
export function answerQuestion(text) {
  const lower = text.toLowerCase();
  for (const faq of FAQ) {
    if (faq.keywords.some((k) => lower.includes(k))) {
      return { answer: faq.answer, matched: faq.q };
    }
  }
  return { answer: DEFAULT_ANSWER, matched: null };
}
