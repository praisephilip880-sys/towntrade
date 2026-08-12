import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { fetchListingById } from '@/lib/listings';
import { notifyOpayPaid, recordOpayPayment, OPAY_ACCOUNT, ngnEstimate } from '@/lib/opay';
export const dynamic = 'force-dynamic';

/**
 * Buyer pressed "I have made the transfer" — records the manual OPay payment
 * against the platform account, creates the escrow transaction, marks the
 * listing sold, and notifies the admin + seller.
 */
export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return unauthorized();

  let body;
  try {
    body = await req.json();
  }
  catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const id = Number(body.listingId);
  const listing = Number.isInteger(id) ? fetchListingById(id) : null;
  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  if (listing.seller.id === user.id) {
    return NextResponse.json({ error: 'You cannot buy your own listing.' }, { status: 400 });
  }
  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'This listing has already been sold.' }, { status: 400 });
  }
  if (listing.price <= 0) {
    return NextResponse.json({ error: 'Free items are claimed — no OPay transfer needed.' }, { status: 400 });
  }
  const buyerNote = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : '';

  const { txId, paymentId } = recordOpayPayment({
    buyerId: user.id,
    sellerId: listing.seller.id,
    listingId: listing.id,
    amount: listing.price,
    buyerNote,
  });

  notifyOpayPaid(paymentId, user.fullName, listing.seller.id, listing.price);

  return NextResponse.json({
    transaction: { id: txId, status: 'escrow_hold', paymentMethod: 'opay' },
    payment: { id: paymentId, status: 'buyer_paid' },
    account: OPAY_ACCOUNT,
    amount: listing.price,
    ngnEstimate: ngnEstimate(listing.price),
    message:
      'Transfer received — your payment is now in escrow. The seller has been notified, and the admin will pay them once you confirm delivery.',
  }, { status: 201 });
}
