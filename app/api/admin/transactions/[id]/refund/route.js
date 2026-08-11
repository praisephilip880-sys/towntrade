import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';
import { refundStripePayment } from '@/lib/escrow';
export const dynamic = 'force-dynamic';


/**
 * Admin: refund a transaction — cancels the purchase, refunds the Stripe
 * PaymentIntent (when one exists), releases escrow back to the buyer and
 * re-lists the item.
 */
export async function POST(_req, { params }) {
  const guard = adminOnly();
  if (guard.error) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid transaction id.' }, { status: 400 });
  }
  const tx = db
    .prepare(`SELECT id, listing_id AS listingId, buyer_id AS buyerId, seller_id AS sellerId,
         amount, status, created_at AS createdAt,
         stripe_checkout_session_id AS checkoutSessionId,
         stripe_payment_intent_id AS paymentIntentId,
         stripe_transfer_id AS transferId
       FROM transactions WHERE id = ?`)
    .get(id);
  if (!tx) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
  if (tx.status !== 'escrow_hold') {
    return NextResponse.json({ error: 'Only escrow_hold transactions can be refunded.' }, { status: 400 });
  }
  const now = new Date().toISOString();
  // Atomically claim the escrow row first — if a buyer release is racing us, one
  // of the two wins and the other gets a clean error instead of double-crediting.
  const claimed = db.prepare(`DELETE FROM transactions WHERE id = ? AND status = 'escrow_hold'`).run(id);
  if (claimed.changes === 0) {
    return NextResponse.json({ error: 'This transaction is no longer in escrow and cannot be refunded.' }, { status: 400 });
  }
  try {
    // Return the buyer's money — Stripe refunds are all-or-nothing.
    await refundStripePayment(tx);
    // Restore the listing so the seller can sell it again.
    db.prepare("UPDATE listings SET status = 'active', updated_at = ? WHERE id = ?").run(now, tx.listingId);
    return NextResponse.json({
      transaction: { id, status: 'refunded' },
      message: `Transaction refunded — $${(tx.amount / 100).toFixed(2)} returned to the buyer and the listing is active again.`,
    });
  }
  catch (err) {
    // Refund failed — restore the escrow row so the admin can retry.
    db.prepare(`INSERT INTO transactions
        (id, listing_id, buyer_id, seller_id, amount, status, created_at, stripe_checkout_session_id, stripe_payment_intent_id, stripe_transfer_id)
        VALUES (?, ?, ?, ?, ?, 'escrow_hold', ?, ?, ?, ?)`)
      .run(id, tx.listingId, tx.buyerId, tx.sellerId, tx.amount, tx.createdAt, tx.checkoutSessionId, tx.paymentIntentId, tx.transferId);
    console.error('[stripe] admin refund failed:', err.message);
    return NextResponse.json({ error: `Refund failed: ${err.message}` }, { status: 500 });
  }
}
