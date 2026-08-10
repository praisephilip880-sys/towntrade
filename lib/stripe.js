import Stripe from 'stripe';

/** TownTrade's platform fee — 5% of the sale, the rest goes to the seller. */
export const PLATFORM_FEE_RATE = 0.05;

/** Stripe currency for all marketplace charges/payouts. */
export const STRIPE_CURRENCY = 'usd';

/** Smallest transfer Stripe accepts (50¢). Below this we skip the wire. */
export const MIN_TRANSFER_AMOUNT = 50;

/** True when a Stripe secret key is configured (i.e. the app runs in live mode). */
export const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

let _stripe = null;

/**
 * Lazily-created Stripe SDK client. Call only after checking stripeConfigured.
 */
export function getStripe() {
  if (!stripeConfigured) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local');
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

/** 5% platform fee in cents (rounded). */
export const calcFee = (amount) => Math.round(amount * PLATFORM_FEE_RATE);

/** Seller payout in cents: 95% of the sale. */
export const calcPayout = (amount) => amount - calcFee(amount);

/**
 * Absolute base URL of the app, used for Stripe success/return URLs.
 * Detects the host from the incoming request so localhost:3000 and
 * deployed domains both work without configuration.
 */
export function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  const host = req?.headers?.get?.('host') ?? req?.headers?.host ?? 'localhost:3000';
  const proto = req?.headers?.get?.('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}
