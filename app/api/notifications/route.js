import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { listNotifications, markRead, unreadCount } from '@/lib/notify';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  return NextResponse.json({
    notifications: listNotifications(user.id),
    unreadCount: unreadCount(user.id),
  });
}

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  let body;
  try {
    body = await req.json();
  }
  catch {
    body = {};
  }
  markRead(user.id, { id: body?.id ?? null, all: body?.all === true });
  return NextResponse.json({ unreadCount: unreadCount(user.id) });
}
