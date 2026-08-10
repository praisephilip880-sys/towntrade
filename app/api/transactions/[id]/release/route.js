import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
import { releaseEscrowToSeller } from '@/lib/escrow';

const COMPLETE_MESSAGE = 'Transaction Complete! 5% platform fee saved, 95% sent to seller.';

/**
 * POST /api/transactions/[id]/release
 * The buyer confirms delivery: the escrow balance (95%) is released straight to
 * the seller's connected Stripe account via a Transfer, and TownTrade keeps the
 * 5% platform fee.
 */
export async function POST(_req, { params }) {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid transaction id.' }, { status: 400 });
  }
  const tx = db
    .prepare(`SELECT id, buyer_id AS buyerId, seller_id AS sellerId, amount, status,
         stripe_payment_intent_id AS paymentIntentId
       FROM transactions WHERE id = ?`)
    .get(id);
  if (!tx) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
  if (tx.buyerId !== user.id) {
    return NextResponse.json({ error: 'Only the buyer can confirm delivery and release funds.' }, { status: 403 });
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
        ? 'Transaction complete — this payout is below Stripe\u2019s $0.50 minimum, so it stays in your TownTrade balance.'
        : COMPLETE_MESSAGE,
    });
  }
  catch (err) {
    console.error('[stripe] release failed:', err.message);
    if (err.code === 'TX_CLAIM_FAILED') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: `Funds were NOT released: ${err.message}` }, { status: 500 });
  }
}
