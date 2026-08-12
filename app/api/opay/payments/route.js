import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { fetchBuyerPayments, OPAY_STATUS_LABELS, OPAY_ACCOUNT, ngnEstimate } from '@/lib/opay';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  const payments = fetchBuyerPayments(user.id).map((p) => ({
    ...p,
    statusLabel: OPAY_STATUS_LABELS[p.status] ?? p.status,
    ngnEstimate: ngnEstimate(p.amount),
  }));
  return NextResponse.json({ payments, account: OPAY_ACCOUNT });
}
