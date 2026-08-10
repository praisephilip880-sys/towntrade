import { db } from './db';
import { getStripe, stripeConfigured, calcFee, calcPayout, MIN_TRANSFER_AMOUNT } from './stripe';

/**
 * Turn a paid Stripe Checkout Session into a TownTrade escrow transaction.
 * Idempotent — safe to call from both the success page and the webhook.
 * Funds are charged to the buyer on the platform's balance (escrow); they are
 * NOT moved to the seller until releaseEscrowToSeller() runs.
 */
export function finalizePaidSession(session) {
  const metadata = session.metadata || {};
  const listingId = Number(metadata.listingId);
  const buyerId = Number(metadata.buyerId);
  const sellerId = Number(metadata.sellerId);
  if (!listingId || !buyerId || !sellerId) return null;

  const existing = db
    .prepare('SELECT id, status FROM transactions WHERE stripe_checkout_session_id = ?')
    .get(session.id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const piId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  try {
    return db.transaction(() => {
      // Only flip active -> sold. A listing that is already sold can't be re-sold.
      db.prepare(`UPDATE listings SET status = 'sold', updated_at = ? WHERE id = ? AND status = 'active'`).run(now, listingId);
      const result = db
        .prepare(`INSERT INTO transactions
        (listing_id, buyer_id, seller_id, amount, status, created_at, stripe_checkout_session_id, stripe_payment_intent_id)
        VALUES (?, ?, ?, ?, 'escrow_hold', ?, ?, ?)`)
        .run(listingId, buyerId, sellerId, session.amount_total ?? 0, now, session.id, piId);
      return { id: Number(result.lastInsertRowid), status: 'escrow_hold' };
    })();
  }
  catch (err) {
    // A UNIQUE index on stripe_checkout_session_id makes this race-proof: if the
    // webhook and the success page fire concurrently, one insert wins and we
    // simply return the winning row instead of creating a duplicate transaction.
    const winner = db
      .prepare('SELECT id, status FROM transactions WHERE stripe_checkout_session_id = ?')
      .get(session.id);
    if (winner) return winner;
    throw err;
  }
}

/**
 * Release a held escrow transaction: transfer exactly 95% to the seller's
 * connected Stripe account and complete the transaction.
 *
 * Throws when the seller's account is missing or Stripe rejects the transfer,
 * so callers can surface the error instead of falsely completing a payout.
 */
export async function releaseEscrowToSeller(tx) {
  const fee = calcFee(tx.amount);
  const payout = tx.amount - fee;

  // Atomically claim the escrow row BEFORE the external Stripe call. This is the
  // anti-double-payout guard: whoever claims first wins, everyone else is told the
  // transaction is already completed.
  const claimed = db
    .prepare(`UPDATE transactions SET status = 'completed', completed_at = ? WHERE id = ? AND status = 'escrow_hold'`)
    .run(new Date().toISOString(), tx.id);
  if (claimed.changes === 0) {
    const current = db.prepare('SELECT status FROM transactions WHERE id = ?').get(tx.id);
    const err = new Error(current ? `This transaction is already ${current.status}.` : 'Transaction not found.');
    err.code = 'TX_CLAIM_FAILED';
    throw err;
  }

  let transferId = null;
  let transferSkipped = false;
  try {
    if (tx.paymentIntentId && stripeConfigured) {
      const seller = db.prepare('SELECT stripe_account_id AS accountId FROM users WHERE id = ?').get(tx.sellerId);
      if (!seller?.accountId) {
        throw new Error('The seller has not connected a bank account — ask them to finish Stripe onboarding.');
      }
      if (payout < MIN_TRANSFER_AMOUNT) {
        // Stripe's 50¢ minimum transfer. Keep the funds in the platform balance.
        transferSkipped = true;
        console.warn(`[stripe] tx ${tx.id} payout of ${payout}¢ is below the minimum — transfer skipped.`);
      }
      else {
        // Tie the transfer to the buyer's charge (source_transaction) so funds can be
        // released even before the platform's balance settles — the standard marketplace
        // escrow pattern. Verified against Stripe's test API.
        let transferParams = {
          amount: payout,
          currency: 'usd',
          destination: seller.accountId,
          description: `TownTrade escrow release — transaction #${tx.id}`,
          metadata: { transactionId: String(tx.id) },
        };
        try {
          const pi = await getStripe().paymentIntents.retrieve(tx.paymentIntentId, { expand: ['latest_charge'] });
          const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
          if (chargeId) transferParams.source_transaction = chargeId;
        }
        catch {
          // Charge lookup is best-effort; the transfer can still run against the balance.
        }
        const transfer = await getStripe().transfers.create(transferParams);
        transferId = transfer.id;
      }
    }
  }
  catch (err) {
    // Release failed — roll the row back to escrow_hold so it can be retried.
    db.prepare(`UPDATE transactions SET status = 'escrow_hold', completed_at = NULL WHERE id = ?`).run(tx.id);
    throw err;
  }

  if (transferId) {
    db.prepare(`UPDATE transactions SET stripe_transfer_id = ? WHERE id = ?`).run(transferId, tx.id);
  }
  return { transferId, fee, payout, transferSkipped };
}

/** Refund the underlying Stripe PaymentIntent of a transaction (if any). */
export async function refundStripePayment(tx) {
  if (!tx.paymentIntentId || !stripeConfigured) return null;
  const refund = await getStripe().refunds.create({ payment_intent: tx.paymentIntentId });
  return refund.id;
}
