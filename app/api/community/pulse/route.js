import { NextResponse } from 'next/server';
import { fetchCommunityStats, fetchPulse } from '@/lib/community';

/** Public live board data: real stats, recent sign-ins, and revenue over time. */
export async function GET(req) {
    const url = new URL(req.url);
    const daysRaw = Number(url.searchParams.get('days'));
    const days = Number.isInteger(daysRaw) && daysRaw >= 7 && daysRaw <= 60 ? daysRaw : 14;
    const pulse = fetchPulse(days);
    const stats = fetchCommunityStats();
    return NextResponse.json({ pulse, stats });
}
