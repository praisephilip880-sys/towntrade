'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from './Toaster';

/**
 * Mounted on the listing page. When Stripe redirects back with
 * ?checkout=success&session_id=... we verify the payment server-side
 * (/api/stripe/confirm) to create the escrow transaction, then refresh the page.
 * When ?checkout=cancelled we simply notify the buyer.
 */
export default function CheckoutSuccessHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current)
            return;
        const sessionId = searchParams.get('session_id');
        const state = searchParams.get('checkout');
        if (!sessionId && !state)
            return;
        handled.current = true;
        const run = async () => {
            if (state === 'cancelled') {
                toast('Checkout cancelled — no charge was made.', 'error');
            }
            else if (sessionId) {
                const res = await fetch('/api/stripe/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                });
                const data = await res.json();
                if (res.ok) {
                    toast(data.message || 'Payment successful — your item is now held in escrow.');
                }
                else {
                    toast(data.error || 'Payment could not be confirmed. Please contact support.', 'error');
                }
            }
            const url = new URL(window.location.href);
            url.searchParams.delete('checkout');
            url.searchParams.delete('session_id');
            window.history.replaceState({}, '', url.toString());
            router.refresh();
        };
        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, router, toast]);

    return _jsx("span", { className: "hidden", "aria-hidden": true });
}
