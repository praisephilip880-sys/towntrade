import { NextResponse } from 'next/server';
import { createChallenge } from '@/lib/challenge';
export const dynamic = 'force-dynamic';


/** Issue a fresh Safety Bot addition challenge for the sign-in form. */
export async function GET() {
    const challenge = createChallenge();
    return NextResponse.json({ challenge });
}
