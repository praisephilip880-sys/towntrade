/**
 * Dependency-free OPay helpers shared by server routes AND client components.
 * This module must never import the database or any Node-only module.
 */
import { NGN_PER_USD, PLATFORM_FEE_RATE } from './constants';

export const OPAY_STATUS_LABELS = {
  buyer_paid: 'Buyer paid — awaiting seller payout details',
  payout_verified: 'Seller account verified — awaiting delivery',
  buyer_approved: 'Buyer confirmed delivery — awaiting admin transfer',
  paid: 'Paid to seller',
  refund_requested: 'Refund requested by buyer',
  refunded: 'Refunded to buyer',
  rejected: 'Refund rejected',
};

/** 5% platform fee + 95% seller payout (cents), matching the Stripe path. */
export const calcFee = (cents) => Math.round(cents * PLATFORM_FEE_RATE);
export const calcPayout = (cents) => cents - calcFee(cents);

/** Naira estimate shown to buyers (approximate rate, configurable). */
export const ngnEstimate = (cents) => Math.round((cents / 100) * NGN_PER_USD);

export function isValidAccountNumber(value) {
  return /^\d{8,12}$/.test(String(value).replace(/\s/g, ''));
}

/** Normalize a person name for fuzzy comparison: "Mia Chen" -> "miachen". */
export function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Simple bigram-based similarity (0..1) — enough for account-name checks. */
export function nameSimilarity(a, b) {
  const A = normalizeName(a);
  const B = normalizeName(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.95;
  const grams = (s) => {
    const out = new Set();
    if (s.length < 2) return out;
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
    return out;
  };
  const ga = grams(A);
  const gb = grams(B);
  let common = 0;
  ga.forEach((g) => gb.has(g) && common++);
  return (2 * common) / (ga.size + gb.size);
}

/**
 * The Safety Bot checks the account holder name the seller typed against
 * their TownTrade profile name. Returns true only on a strong match.
 */
export function verifyAccountName(accountHolder, profileName) {
  const score = nameSimilarity(accountHolder, profileName);
  return { match: score >= 0.8, score: Math.round(score * 100) };
}

/** The Safety Bot asks up to 5 questions before a refund is escalated. */
export const REFUND_QUESTIONS = [
  { id: 'delivered', q: 'Did the seller deliver the item to you?', options: ['Yes', 'No', 'Partially'] },
  { id: 'received', q: 'Have you physically received the item?', options: ['Yes', 'No'] },
  { id: 'waited', q: 'How long have you waited since you paid?', options: ['Less than a day', '1–3 days', 'More than 3 days'] },
  { id: 'responded', q: 'Did the seller respond to your messages?', options: ['Yes, always', 'Sometimes', 'No, never'] },
  { id: 'describe', q: 'In a sentence, what went wrong?', options: [] },
];
