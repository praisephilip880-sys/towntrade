import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/constants';
/**
 * Lightweight guard: without the session cookie, redirect to the landing page's
 * auth modal (#auth). The authoritative check happens server-side in each page
 * via requireUser(), which validates the cookie against the database.
 */
export function middleware(request) {
    const hasSession = request.cookies.has(SESSION_COOKIE);
    if (!hasSession) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.search = '';
        url.hash = 'auth';
        return NextResponse.redirect(url);
    }
    return NextResponse.next();
}
export const config = {
    matcher: ['/marketplace/:path*', '/listing/:path*', '/chat/:path*', '/profile/:path*', '/admin/:path*'],
};
