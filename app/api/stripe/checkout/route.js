import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchListingById } from '@/lib/listings';
import { getStripe, stripeConfigured, appUrl, STRIPE_CURRENCY } from '@/lib/stripe';

/**
 * POST /api/stripe/checkout  { listingId }
 * Creates a Stripe Checkout Session for a paid listing.
 *
 * TRUE ESCROW: the buyer is charged on TownTrade's Stripe balance and no
 * transfer is created here — the 95% sits in the platform balance until the
 * buyer confirms delivery (/api/transactions/[id]/release), which moves it to
 * the seller's connected account. TownTrade keeps the 5% platform fee.
 */
export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  if (!stripeConfigured) {
    return NextResponse.json(
      { error: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY to .env.local.' },
      { status: 503 }
    );
  }
  let body;
  try {
    body = await req.json();
  }
  catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const listingId = Number(body.listingId);
  const listing = Number.isInteger(listingId) ? fetchListingById(listingId) : null;
  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  if (listing.seller.id === user.id) {
    return NextResponse.json({ error: 'You cannot buy your own listing.' }, { status: 400 });
  }
  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'This listing has already been sold.' }, { status: 400 });
  }
  if (listing.price <= 0) {
    return NextResponse.json({ error: 'Free items are claimed instantly — no checkout needed.' }, { status: 400 });
  }
  const openEscrow = db
    .prepare("SELECT 1 FROM transactions WHERE listing_id = ? AND status = 'escrow_hold' LIMIT 1")
    .get(listingId);
  if (openEscrow) {
    return NextResponse.json({ error: 'This item is already held in escrow.' }, { status: 400 });
  }
  const seller = db.prepare('SELECT stripe_account_id AS accountId FROM users WHERE id = ?').get(listing.seller.id);
  if (!seller?.accountId) {
    return NextResponse.json(
      { error: 'This seller has not connected a bank account yet, so checkout is unavailable right now.' },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const baseUrl = appUrl(req);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: STRIPE_CURRENCY,
            product_data: {
              name: listing.title,
              description: (listing.description || '').slice(0, 500),
              metadata: { listingId: String(listingId) },
            },
            unit_amount: listing.price,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          listingId: String(listingId),
          buyerId: String(user.id),
          sellerId: String(listing.seller.id),
          townTradeEscrow: '1',
        },
      },
      customer_email: user.email,
      metadata: {
        listingId: String(listingId),
        buyerId: String(user.id),
        sellerId: String(listing.seller.id),
      },
      success_url: `${baseUrl}/listing/${listingId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/listing/${listingId}?checkout=cancelled`,
    });
    return NextResponse.json({ url: session.url, sessionId: session.id });
  }
  catch (err) {
    console.error('[stripe] checkout failed:', err.message);
    return NextResponse.json({ error: `Checkout failed: ${err.message}` }, { status: 500 });
  }
}
