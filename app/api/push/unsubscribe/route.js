import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { deletePushSubscription } from '@/lib/push';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  deletePushSubscription(user.id, body?.endpoint);
  return NextResponse.json({ ok: true });
}
