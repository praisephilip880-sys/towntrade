import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { adminCompleteOpay } from '@/lib/opay';
export const dynamic = 'force-dynamic';

/** Admin confirms they transferred the payout from their OPay account. */
export async function POST(_req, { params }) {
  const guard = adminOnly();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid payment.' }, { status: 400 });
  }
  try {
    adminCompleteOpay(id);
    return NextResponse.json({ message: 'Payout marked as sent — the seller has been notified. 💸' });
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Could not complete the payout.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
