import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import { finalizePaidSession } from '@/lib/escrow';
export const dynamic = 'force-dynamic';


/**
 * POST /api/stripe/webhook
 * Signature-verified Stripe events. Requires STRIPE_WEBHOOK_SECRET (see .env.example).
 * Events handled:
 *  - checkout.session.completed -> create the escrow transaction (idempotent)
 *  - account.updated           -> sync bank_connected when a seller finishes onboarding
 *  - charge.refunded           -> (logged; refunds are initiated via the admin refund route)
 */
export async function POST(req) {
  if (!stripeConfigured) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not set. Add it to .env.local (see .env.example).' },
      { status: 400 }
    );
  }
  const signature = req.headers.get('stripe-signature');
  const payload = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  }
  catch (err) {
    console.warn('[stripe] webhook signature invalid:', err.message);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const tx = finalizePaidSession(session);
      if (tx) console.log(`[stripe] escrow transaction #${tx.id} created via webhook.`);
      break;
    }
    case 'account.updated': {
      const acct = event.data.object;
      const row = db.prepare('SELECT id FROM users WHERE stripe_account_id = ?').get(acct.id);
      if (row) {
        db.prepare('UPDATE users SET bank_connected = ? WHERE id = ?').run(acct.payouts_enabled ? 1 : 0, row.id);
        console.log(`[stripe] seller #${row.id} payouts_enabled=${!!acct.payouts_enabled}`);
      }
      break;
    }
    case 'charge.refunded':
      console.log('[stripe] charge refunded:', event.data.object.id);
      break;
    default:
      // Ignore everything else (payment_intent.* etc. are handled via confirm + webhooks above).
      break;
  }

  return NextResponse.json({ received: true });
}
