import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { savePushSubscription } from '@/lib/push';
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
  const ok = savePushSubscription(user.id, body?.subscription);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid push subscription.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
