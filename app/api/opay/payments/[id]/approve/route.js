import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { approveOpayDelivery } from '@/lib/opay';
export const dynamic = 'force-dynamic';

/** Buyer confirms they received the item → admin can transfer to the seller. */
export async function POST(_req, { params }) {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid payment.' }, { status: 400 });
  }
  try {
    approveOpayDelivery(id, user.id);
    return NextResponse.json({
      message: 'Delivery confirmed! 5% platform fee saved, 95% goes to the seller once the admin transfers it. 🎉',
    });
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Could not approve delivery.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
