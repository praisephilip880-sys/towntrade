import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
import { getStripe, stripeConfigured, appUrl } from '@/lib/stripe';
export const dynamic = 'force-dynamic';


/**
 * POST /api/stripe/onboarding
 * Creates (or reuses) the seller's Stripe Connect Express account and returns
 * a unique Express onboarding URL. Redirect the seller there to securely add
 * their bank payout details; return_url brings them back to /profile?tab=payout.
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
  const stripe = getStripe();
  const baseUrl = appUrl(req);
  try {
    const row = db.prepare('SELECT stripe_account_id AS accountId FROM users WHERE id = ?').get(user.id);
    let accountId = row?.accountId;
    let account;
    if (accountId) {
      account = await stripe.accounts.retrieve(accountId);
    }
    else {
      const accountParams = {
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: { transfers: { requested: true } },
        metadata: { userId: String(user.id) },
      };
      // Stripe rejects localhost URLs in business_profile.url — only send it for real domains.
      if (!/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(baseUrl)) {
        accountParams.business_profile = { url: baseUrl };
      }
      account = await stripe.accounts.create(accountParams);
      accountId = account.id;
      db.prepare('UPDATE users SET stripe_account_id = ? WHERE id = ?').run(accountId, user.id);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/profile?tab=payout&connect=refresh`,
      return_url: `${baseUrl}/profile?tab=payout&connect=return`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: link.url, accountId });
  }
  catch (err) {
    console.error('[stripe] onboarding failed:', err.message);
    return NextResponse.json({ error: `Stripe onboarding failed: ${err.message}` }, { status: 500 });
  }
}
