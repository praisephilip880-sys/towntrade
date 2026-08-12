import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { submitRefundRequest } from '@/lib/opay';
export const dynamic = 'force-dynamic';

/** Buyer requests a refund with the Safety Bot's questions answered. */
export async function POST(req, { params }) {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid payment.' }, { status: 400 });
  }
  let body;
  try {
    body = await req.json();
  }
  catch {
    body = {};
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const botAnswers = Array.isArray(body.botAnswers) ? body.botAnswers.slice(0, 5) : [];
  const refundAccount = typeof body.refundAccount === 'string' ? body.refundAccount.trim() : '';
  if (reason.length < 5) {
    return NextResponse.json({ error: 'Please describe why you want a refund (at least 5 characters).' }, { status: 400 });
  }
  if (refundAccount.length < 8) {
    return NextResponse.json({ error: 'Please enter the account number you want the refund sent to (8–12 digits).' }, { status: 400 });
  }
  try {
    const refundId = submitRefundRequest({ paymentId: id, buyerId: user.id, reason, botAnswers, refundAccount });
    return NextResponse.json({
      refundId,
      message: 'Refund request submitted. The Safety Bot answers and your reason are with the admin for review — you will be notified.',
    }, { status: 201 });
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Could not submit the refund request.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
