import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchSellerPayments, OPAY_STATUS_LABELS, submitSellerPayout, ngnEstimate } from '@/lib/opay';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  const payments = fetchSellerPayments(user.id).map((p) => ({
    ...p,
    statusLabel: OPAY_STATUS_LABELS[p.status] ?? p.status,
    ngnEstimate: ngnEstimate(p.amount),
  }));
  return NextResponse.json({ payments });
}

/** Seller submits their account number; the Safety Bot verifies the name. */
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
  const paymentId = Number(body.paymentId);
  const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.trim() : '';
  const accountHolder = typeof body.accountHolder === 'string' ? body.accountHolder.trim() : '';
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    return NextResponse.json({ error: 'Missing payment.' }, { status: 400 });
  }
  if (accountHolder.length < 2) {
    return NextResponse.json({ error: 'Please enter the name on the account.' }, { status: 400 });
  }
  try {
    const payoutId = submitSellerPayout({ paymentId, sellerId: user.id, accountNumber, accountHolder });
    return NextResponse.json({ payoutId, message: 'Account verified by the Safety Bot — your payout details have been sent to the admin.' }, { status: 201 });
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Could not submit payout details.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
