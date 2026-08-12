import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { db } from '@/lib/db';
import { releaseEscrowToSeller } from '@/lib/escrow';
export const dynamic = 'force-dynamic';


/**
 * Admin: force-complete an escrow_hold transaction, releasing the 95% balance
 * to the seller's connected Stripe account via a real Transfer.
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
    .prepare(`SELECT id, buyer_id AS buyerId, seller_id AS sellerId, amount, status,
         payment_method AS paymentMethod, stripe_payment_intent_id AS paymentIntentId
       FROM transactions WHERE id = ?`)
    .get(id);
  if (!tx) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
  if (tx.paymentMethod === 'opay') {
    return NextResponse.json({ error: 'This is an OPay local payment — complete it from the OPay Payouts tab instead.' }, { status: 400 });
  }
  if (tx.status !== 'escrow_hold') {
    return NextResponse.json({ error: 'This transaction is already completed.' }, { status: 400 });
  }
  try {
    const { transferId, fee, payout, transferSkipped } = await releaseEscrowToSeller(tx);
    return NextResponse.json({
      transaction: { id, status: 'completed', transferId },
      fee,
      payout,
      transferSkipped,
      message: transferSkipped
        ? 'Transaction complete — this payout is below Stripe\u2019s $0.50 minimum, so it stays in the TownTrade balance.'
        : 'Transaction Complete! 5% platform fee saved, 95% sent to seller.',
    });
  }
  catch (err) {
    console.error('[stripe] admin release failed:', err.message);
    if (err.code === 'TX_CLAIM_FAILED') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: `Funds were NOT released: ${err.message}` }, { status: 500 });
  }
}
