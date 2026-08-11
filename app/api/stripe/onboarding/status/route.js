import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
import { getStripe, stripeConfigured } from '@/lib/stripe';
export const dynamic = 'force-dynamic';


/**
 * GET /api/stripe/onboarding/status
 * Checks the seller's Express account and stores the result on the user row.
 * `payouts_enabled` is the gate that matters: it means the seller can receive
 * escrow releases to their bank.
 */
export async function GET() {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  if (!stripeConfigured) {
    return NextResponse.json({ onboarded: false, configured: false });
  }
  const row = db.prepare('SELECT stripe_account_id AS accountId FROM users WHERE id = ?').get(user.id);
  if (!row?.accountId) {
    return NextResponse.json({ onboarded: false, configured: true, accountId: null });
  }
  try {
    const acct = await getStripe().accounts.retrieve(row.accountId);
    const onboarded = acct.payouts_enabled === true;
    db.prepare('UPDATE users SET bank_connected = ? WHERE id = ?').run(onboarded ? 1 : 0, user.id);
    return NextResponse.json({
      onboarded,
      configured: true,
      accountId: acct.id,
      detailsSubmitted: acct.details_submitted === true,
      chargesEnabled: acct.charges_enabled === true,
      payoutsEnabled: acct.payouts_enabled === true,
    });
  }
  catch (err) {
    console.error('[stripe] status check failed:', err.message);
    return NextResponse.json({ error: 'Could not check onboarding status.' }, { status: 500 });
  }
}
