import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { resolveRefund } from '@/lib/opay';
export const dynamic = 'force-dynamic';

/** Admin approves or rejects a buyer's refund request. */
export async function PUT(req, { params }) {
  const guard = adminOnly();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid refund request.' }, { status: 400 });
  }
  let body;
  try {
    body = await req.json();
  }
  catch {
    body = {};
  }
  try {
    resolveRefund(id, body.approve === true);
    return NextResponse.json({ message: body.approve ? 'Refund approved — buyer and seller notified.' : 'Refund request rejected.' });
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Could not resolve the refund.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
