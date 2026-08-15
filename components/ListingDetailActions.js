'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/format';
import { useToast } from './Toaster';
import ReviewModal from './ReviewModal';
import PaymentModal from './PaymentModal';
import { useCurrency } from './CurrencyProvider';
import { IconBank, IconChat, IconCheck, IconEdit, IconShield, IconTrash } from './icons';
export default function ListingDetailActions({ listing, viewerId, myTransaction }) {
    const router = useRouter();
    const { toast } = useToast();
    const { currency } = useCurrency();
    const [payOpen, setPayOpen] = useState(false);
    const [payStep, setPayStep] = useState('choose');
    const [reviewOpen, setReviewOpen] = useState(false);
    const isOwner = listing.seller.id === viewerId;
    const isBuyer = myTransaction.status !== null;
    const messageSeller = async () => {
        try {
            const res = await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: listing.id, sellerId: listing.seller.id }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 401)
                    return router.push('/#auth');
                toast(data.error || 'Could not start a chat.', 'error');
                return;
            }
            router.push(`/chat?chat=${data.chat.id}`);
        }
        catch {
            toast('Network error. Please try again.', 'error');
        }
    };
    const deleteListing = async () => {
        if (!window.confirm(`Delete “${listing.title}”? This cannot be undone.`))
            return;
        const res = await fetch(`/api/listings/${listing.id}`, { method: 'DELETE' });
        if (!res.ok)
            return toast('Could not delete listing.', 'error');
        toast('Listing removed.');
        router.push('/profile');
        router.refresh();
    };
    const buyNow = (step = 'choose') => {
        // Opens the payment method modal: pay by card (Stripe) or OPay local transfer.
        setPayStep(step);
        setPayOpen(true);
    };
    const claimIt = async () => {
        const res = await fetch(`/api/listings/${listing.id}/purchase`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
            if (res.status === 401)
                return router.push('/#auth');
            toast(data.error || 'Could not claim this item.', 'error');
            return;
        }
        toast(data.message || 'Claimed!');
        router.refresh();
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "space-y-3", children: [isOwner ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-3 rounded-2xl border border-charcoal-100 bg-charcoal-50/50 px-4 py-3", children: [_jsx("span", { className: "flex h-9 w-9 items-center justify-center rounded-xl bg-charcoal-100 text-charcoal-600", children: _jsx(IconEdit, { className: "h-4 w-4" }) }), _jsxs("p", { className: "text-sm text-charcoal-600", children: ["This is ", _jsx("span", { className: "font-bold text-charcoal-900", children: "your listing" }), ". Edit it or remove it once it\u2019s sold."] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs(Link, { href: `/listing/${listing.id}/edit`, className: "flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98]", children: [_jsx(IconEdit, { className: "h-4 w-4" }), " Edit Listing"] }), _jsxs("button", { onClick: deleteListing, className: "flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-charcoal-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-charcoal-800 active:scale-[0.98]", children: [_jsx(IconTrash, { className: "h-4 w-4" }), " Delete"] })] })] })) : listing.status === 'sold' ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-3 rounded-2xl border border-charcoal-100 bg-charcoal-50/50 px-4 py-3", children: [_jsx("span", { className: "flex h-9 w-9 items-center justify-center rounded-xl bg-charcoal-100 text-charcoal-500", children: "Sold" }), _jsx("p", { className: "text-sm text-charcoal-600", children: isBuyer ? 'You purchased this item.' : 'This listing has already been sold.' })] }), isBuyer && myTransaction.status === 'escrow_hold' && (_jsxs(Link, { href: "/profile?tab=purchases", className: "flex w-full items-center justify-center gap-2 rounded-full border-2 border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100", children: [_jsx(IconShield, { className: "h-4 w-4" }), " In Escrow \u2014 go to My Purchases"] })), isBuyer && myTransaction.status === 'completed' && (_jsxs("div", { className: "space-y-2", children: [_jsxs("p", { className: "flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700", children: [_jsx(IconCheck, { className: "h-4 w-4" }), " Transaction complete \u00B7 funds released to seller"] }), !myTransaction.reviewGiven && (_jsxs("button", { onClick: () => setReviewOpen(true), className: "w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98]", children: ["\u2B50 Leave a review for ", listing.seller.fullName.split(' ')[0]] }))] }))] })) : (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: messageSeller, className: "flex w-full items-center justify-center gap-2 rounded-full border-2 border-charcoal-200 bg-white px-5 py-3 text-sm font-bold text-charcoal-800 transition hover:border-emerald-300 hover:text-emerald-700", children: [_jsx(IconChat, { className: "h-4 w-4" }), " Chat with Seller"] }), listing.price > 0 ? (_jsxs("div", { className: "space-y-2.5", children: [_jsx("button", { onClick: () => buyNow('choose'), className: "w-full rounded-full bg-emerald-600 px-5 py-3.5 text-base font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98]", children: `Buy Now \u00B7 ${formatPrice(listing.price, currency)}` }), _jsx("button", { onClick: () => buyNow('opay'), className: "flex w-full items-center justify-center gap-2 rounded-full border-2 border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100 active:scale-[0.98]", children: [_jsx(IconBank, { className: "h-4 w-4" }), "Pay with OPay (Local Transfer)"] })] })) : (_jsx("button", { onClick: claimIt, className: "w-full rounded-full bg-emerald-600 px-5 py-3.5 text-base font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98]", children: "Claim It \u2014 It\u2019s Free" })), _jsxs("p", { className: "flex items-center justify-center gap-1.5 text-center text-[11px] text-charcoal-400", children: [_jsx(IconShield, { className: "h-3.5 w-3.5 text-emerald-600" }), "Escrow-protected \u00B7 pay by card or OPay local transfer"] })] }))] }), payOpen && (_jsx(PaymentModal, { listing: listing, initialStep: payStep, onClose: () => setPayOpen(false) })), reviewOpen && (_jsx(ReviewModal, { revieweeName: listing.seller.fullName, revieweeId: listing.seller.id, listingId: listing.id, onClose: () => setReviewOpen(false), onDone: () => {
                    setReviewOpen(false);
                    router.refresh();
                } }))] }));
}
