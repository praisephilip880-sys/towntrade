import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import { finalizePaidSession } from '@/lib/escrow';

/**
 * POST /api/stripe/confirm  { sessionId }
 * Called from the listing page after Stripe redirects back with ?checkout=success.
 * Server-side verification: we confirm the session is actually paid before the
 * escrow transaction is created (idempotent, so webhooks + this can both fire).
 */
export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  if (!stripeConfigured) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
  }
  let body;
  try {
    body = await req.json();
  }
  catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) return NextResponse.json({ error: 'Missing session_id.' }, { status: 400 });

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment is not complete yet.' }, { status: 400 });
    }
    const metadata = session.metadata || {};
    if (Number(metadata.buyerId) !== user.id && !user.isAdmin) {
      return NextResponse.json({ error: 'This checkout does not belong to your account.' }, { status: 403 });
    }
    const tx = finalizePaidSession(session);
    if (!tx) {
      return NextResponse.json({ error: 'Checkout metadata is invalid.' }, { status: 400 });
    }
    return NextResponse.json({
      transaction: tx,
      message: 'Payment successful — your item is now held in escrow.',
    });
  }
  catch (err) {
    console.error('[stripe] confirm failed:', err.message);
    return NextResponse.json({ error: `Could not confirm payment: ${err.message}` }, { status: 500 });
  }
}
