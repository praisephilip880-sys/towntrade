import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { fetchAllOpayPayments, fetchRefundRequests, OPAY_STATUS_LABELS, ngnEstimate } from '@/lib/opay';
export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = adminOnly();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const payments = fetchAllOpayPayments().map((p) => ({
    ...p,
    statusLabel: OPAY_STATUS_LABELS[p.status] ?? p.status,
    ngnEstimate: ngnEstimate(p.amount),
    // Quick flag for the "if the admin is not active" side panel: every payout
    // that needs a manual OPay transfer, plus whether the buyer approved.
  }));
  const refunds = fetchRefundRequests();
  return NextResponse.json({ payments, refunds });
}
