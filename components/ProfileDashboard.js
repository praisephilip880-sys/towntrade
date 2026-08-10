'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDate, formatPrice, initials } from '@/lib/format';
import { useToast } from './Toaster';
import StarRating from './StarRating';
import VerifiedBadge from './VerifiedBadge';
import ReviewModal from './ReviewModal';
import { IconBank, IconCheck, IconEdit, IconEye, IconMapPin, IconShield, IconTag, IconTrash, IconUser, } from './icons';
import { fileToDataUrl } from '@/lib/image';
const TABS = [
    { key: 'listings', label: 'My Listings' },
    { key: 'purchases', label: 'My Purchases' },
    { key: 'sales', label: 'My Sales' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'payout', label: 'Payout Settings' },
];
export default function ProfileDashboard({ user, initial, initialTab = 'listings' }) {
    const router = useRouter();
    const { toast } = useToast();
    const [tab, setTab] = useState(initialTab);
    const [reviewTarget, setReviewTarget] = useState(null);
    const data = useMemo(() => {
        const purchases = initial.purchases;
        const pending = purchases.filter((t) => t.status === 'escrow_hold');
        const escrowValue = pending.reduce((sum, t) => sum + t.amount, 0);
        const paidOut = initial.sales
            .filter((t) => t.status === 'completed')
            .reduce((sum, t) => sum + Math.round(t.amount * 0.95), 0);
        return { purchases, pending, escrowValue, paidOut };
    }, [initial]);
    const setTabAndUrl = (t) => {
        setTab(t);
        router.replace(t === 'listings' ? '/profile' : `/profile?tab=${t}`, { scroll: false });
    };
    /* ------------------------------ actions ------------------------------ */
    const deleteListing = async (listingId, title) => {
        if (!window.confirm(`Delete “${title}”? This cannot be undone.`))
            return;
        const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' });
        if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            toast(d.error || 'Could not delete listing.', 'error');
            return;
        }
        toast('Listing removed.');
        router.refresh();
    };
    const releaseFunds = async (txId) => {
        const res = await fetch(`/api/transactions/${txId}/release`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
            toast(data.error || 'Could not release funds.', 'error');
            return;
        }
        toast(data.message || 'Transaction Complete! 5% platform fee saved, 95% sent to seller.');
        router.refresh();
    };
    const [bankConnected, setBankConnected] = useState(user.bankConnected);
    const [linking, setLinking] = useState(false);
    const [checkingPayout, setCheckingPayout] = useState(false);
    const [savingAvatar, setSavingAvatar] = useState(false);
    const saveAvatar = async (file) => {
        if (savingAvatar)
            return;
        setSavingAvatar(true);
        try {
            const avatar = await fileToDataUrl(file, 320, 0.85);
            const res = await fetch('/api/users/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar }),
            });
            if (!res.ok)
                return toast('Could not save profile picture.', 'error');
            toast('Profile picture updated! 📸');
            router.refresh();
        }
        catch (err) {
            toast(err.message || 'Could not read that image.', 'error');
        }
        finally {
            setSavingAvatar(false);
        }
    };
    useEffect(() => {
        // Refresh the real Stripe Connect status (e.g. right after returning from Stripe Express).
        const check = async () => {
            setCheckingPayout(true);
            try {
                const res = await fetch('/api/stripe/onboarding/status', { cache: 'no-store' });
                const data = await res.json();
                if (res.ok && typeof data.onboarded === 'boolean') {
                    setBankConnected(data.onboarded);
                }
            }
            catch { /* keep current state */ }
            finally {
                setCheckingPayout(false);
            }
        };
        check();
        // Strip the ?connect=return/refresh marker Stripe's return_url left behind.
        const params = new URLSearchParams(window.location.search);
        if (params.get('connect')) {
            const url = new URL(window.location.href);
            url.searchParams.delete('connect');
            window.history.replaceState({}, '', url.toString());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const linkBank = async () => {
        if (linking)
            return;
        setLinking(true);
        try {
            const res = await fetch('/api/stripe/onboarding', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                toast(data.error || 'Could not start bank onboarding.', 'error');
                return;
            }
            // Redirect the seller to Stripe Express to securely add their payout details.
            window.location.href = data.url;
        }
        catch {
            toast('Network error. Please try again.', 'error');
        }
        finally {
            setLinking(false);
        }
    };
    const verifyLocation = async () => {
        const res = await fetch('/api/users/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locationVerified: true }),
        });
        if (!res.ok)
            return toast('Could not verify location.', 'error');
        toast('Location verified — you are now a Verified Neighbor! 🛡️');
        router.refresh();
    };
    /* -------------------------------- render ------------------------------ */
    return (_jsxs("div", { className: "mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "overflow-hidden rounded-3xl border border-charcoal-100 bg-white shadow-soft", children: [_jsx("div", { className: "h-24 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500" }), _jsxs("div", { className: "px-6 pb-6", children: [_jsxs("div", { className: "-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [_jsxs("div", { className: "flex items-end gap-4", children: [(_jsxs("div", { className: "relative", children: [user.avatar ? (_jsx("img", { src: user.avatar, alt: user.fullName, className: "h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-soft" })) : (_jsx("span", { className: "flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-emerald-500 to-emerald-800 text-2xl font-extrabold text-white shadow-soft", children: initials(user.fullName) })), _jsx("input", { id: "avatar-upload", type: "file", accept: "image/*", className: "hidden", onChange: (e) => {
            const f = e.target.files?.[0];
            if (f)
                saveAvatar(f);
        } }), _jsxs("label", { htmlFor: "avatar-upload", title: "Change profile picture", className: "absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-xs text-white shadow-md transition hover:bg-emerald-500 active:scale-95", children: [savingAvatar ? (_jsx("span", { className: "h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" })) : (_jsx("span", { children: "📷" }))] })] })), _jsxs("div", { className: "pb-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("h1", { className: "text-2xl font-extrabold tracking-tight text-charcoal-950", children: user.fullName }), user.locationVerified && _jsx(VerifiedBadge, { size: "md" }), bankConnected && (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white", children: [_jsx(IconCheck, { className: "h-3.5 w-3.5" }), " Account Connected"] }))] }), _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-charcoal-500", children: [_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(IconMapPin, { className: "h-4 w-4 text-emerald-600" }), user.neighborhood] }), _jsx("span", { className: "text-charcoal-300", children: "\u00B7" }), _jsxs("span", { children: ["Member since ", formatDate(user.createdAt)] })] })] })] }), _jsx("div", { className: "pb-1", children: _jsx(StarRating, { value: initial.rating.avg, count: initial.rating.count, size: "lg", showValue: true }) })] }), _jsxs("div", { className: "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4", children: [_jsx(Stat, { label: "Active listings", value: initial.listings.filter((l) => l.status === 'active').length }), _jsx(Stat, { label: "In escrow", value: initial.purchases.filter((t) => t.status === 'escrow_hold').length, accent: true }), _jsx(Stat, { label: "Purchases", value: initial.purchases.length }), _jsx(Stat, { label: "Sales", value: initial.sales.length })] })] })] }), _jsx("div", { className: "mt-6 flex gap-1 overflow-x-auto rounded-full border border-charcoal-100 bg-white p-1 shadow-soft", children: TABS.map((t) => (_jsx("button", { onClick: () => setTabAndUrl(t.key), className: `shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${tab === t.key ? 'bg-charcoal-950 text-white shadow-sm' : 'text-charcoal-600 hover:bg-charcoal-50 hover:text-charcoal-950'}`, children: t.label }, t.key))) }), _jsxs("div", { className: "mt-6", children: [tab === 'listings' && (_jsxs("div", { className: "space-y-3", children: [initial.listings.length === 0 && (_jsx(EmptyState, { icon: _jsx(IconTag, { className: "h-6 w-6" }), title: "No listings yet", body: "Post your first item or service and it will show up here.", cta: { href: '/listing/new', label: 'Post a Listing' } })), initial.listings.map((l) => (_jsxs("div", { className: "flex flex-col gap-4 rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft transition hover:border-emerald-200 sm:flex-row sm:items-center", children: [_jsxs(Link, { href: `/listing/${l.id}`, className: "flex min-w-0 flex-1 items-center gap-4", children: [l.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            _jsx("img", { src: l.image, alt: l.title, className: "h-16 w-16 shrink-0 rounded-xl object-cover" })) : (_jsx("span", { className: "flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl", children: "\uD83C\uDFF7\uFE0F" })), _jsxs("span", { className: "min-w-0", children: [_jsxs("span", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "truncate text-sm font-bold text-charcoal-950", children: l.title }), l.status === 'sold' ? (_jsx("span", { className: "rounded-full bg-charcoal-100 px-2 py-0.5 text-[10px] font-bold text-charcoal-600", children: "Sold" })) : (_jsx("span", { className: "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200", children: "Active" }))] }), _jsxs("span", { className: "mt-0.5 block text-sm text-charcoal-400", children: [formatPrice(l.price), " \u00B7 ", l.seller.neighborhood] })] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [_jsxs(Link, { href: `/listing/${l.id}/edit`, className: "inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95", children: [_jsx(IconEdit, { className: "h-3.5 w-3.5" }), " Edit"] }), _jsxs("button", { onClick: () => deleteListing(l.id, l.title), className: "inline-flex items-center gap-1.5 rounded-full bg-charcoal-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-charcoal-800 active:scale-95", children: [_jsx(IconTrash, { className: "h-3.5 w-3.5" }), " Delete"] })] })] }, l.id)))] })), tab === 'purchases' && (_jsxs("div", { className: "space-y-3", children: [initial.purchases.length === 0 && (_jsx(EmptyState, { icon: _jsx(IconUser, { className: "h-6 w-6" }), title: "No purchases yet", body: "When you buy something with Buy Now, it shows up here \u2014 held in escrow until you confirm delivery.", cta: { href: '/marketplace', label: 'Browse Marketplace' } })), initial.purchases.map((t) => (_jsxs("div", { className: "rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center", children: [_jsxs(Link, { href: `/listing/${t.listingId}`, className: "flex min-w-0 flex-1 items-center gap-4", children: [t.listingImage ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    _jsx("img", { src: t.listingImage, alt: "", className: "h-16 w-16 shrink-0 rounded-xl object-cover" })) : (_jsx("span", { className: "flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-charcoal-50 text-2xl", children: "\uD83D\uDECD\uFE0F" })), _jsxs("span", { className: "min-w-0", children: [_jsx("span", { className: "truncate text-sm font-bold text-charcoal-950", children: t.listingTitle }), _jsxs("span", { className: "mt-0.5 block text-sm text-charcoal-400", children: ["from ", t.counterpartyName, " \u00B7 ", formatPrice(t.amount), " \u00B7 ", formatDate(t.createdAt)] }), t.status === 'escrow_hold' && (_jsxs("span", { className: "mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-amber-500" }), "In Escrow \u2014 awaiting delivery confirmation"] })), t.status === 'completed' && (_jsxs("span", { className: "mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200", children: [_jsx(IconCheck, { className: "h-3 w-3" }), " Completed \u00B7 ", formatDate(t.completedAt ?? t.createdAt)] }))] })] }), _jsxs("div", { className: "flex shrink-0 flex-wrap items-center gap-2", children: [t.status === 'escrow_hold' && (_jsxs("button", { onClick: () => releaseFunds(t.id), className: "inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95", children: [_jsx(IconCheck, { className: "h-3.5 w-3.5" }), " Confirm Delivery / Release Funds"] })), t.status === 'completed' && !t.reviewGiven && (_jsxs("button", { onClick: () => setReviewTarget({ id: t.counterpartyId, name: t.counterpartyName, listingId: t.listingId }), className: "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100 active:scale-95", children: ["\u2B50 Rate ", t.counterpartyName.split(' ')[0]] })), t.status === 'completed' && t.reviewGiven && (_jsx("span", { className: "inline-flex items-center gap-1 rounded-full bg-charcoal-50 px-3 py-2 text-xs font-semibold text-charcoal-500", children: "\u2713 Reviewed" }))] })] }), t.status === 'escrow_hold' && t.amount > 0 && (_jsxs("p", { className: "mt-3 rounded-xl bg-charcoal-50/60 px-3.5 py-2.5 text-xs leading-relaxed text-charcoal-500", children: ["\uD83D\uDCB0 ", _jsx("span", { className: "font-bold text-charcoal-800", children: formatPrice(t.amount) }), " is locked in TownTrade escrow. Once you confirm delivery, the seller receives ", _jsx("span", { className: "font-bold text-emerald-700", children: "95%" }), " and TownTrade keeps a", ' ', _jsx("span", { className: "font-bold text-charcoal-800", children: "5%" }), " platform fee."] }))] }, t.id)))] })), tab === 'sales' && (_jsxs("div", { className: "space-y-3", children: [initial.sales.length === 0 && (_jsx(EmptyState, { icon: _jsx(IconTag, { className: "h-6 w-6" }), title: "No sales yet", body: "When a neighbor buys one of your listings, it appears here." })), initial.sales.map((t) => (_jsxs("div", { className: "flex items-center gap-4 rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft", children: [t.listingImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    _jsx("img", { src: t.listingImage, alt: "", className: "h-14 w-14 shrink-0 rounded-xl object-cover" })) : (_jsx("span", { className: "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-charcoal-50 text-2xl", children: "\uD83D\uDCE6" })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-bold text-charcoal-950", children: t.listingTitle }), _jsxs("p", { className: "text-xs text-charcoal-400", children: ["Sold to ", t.counterpartyName, " \u00B7 ", formatPrice(t.amount), " \u00B7 ", formatDate(t.createdAt)] })] }), t.status === 'escrow_hold' ? (_jsxs("span", { className: "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-amber-500" }), formatPrice(t.amount), " pending in escrow"] })) : (_jsxs("span", { className: "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200", children: [_jsx(IconCheck, { className: "h-3 w-3" }), "Paid out ", formatPrice(Math.round(t.amount * 0.95))] }))] }, t.id)))] })), tab === 'reviews' && (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "rounded-2xl border border-charcoal-100 bg-white p-5 shadow-soft", children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold text-charcoal-950", children: "Neighbor reputation" }), _jsx("p", { className: "text-xs text-charcoal-400", children: "Ratings from completed transactions" })] }), _jsx(StarRating, { value: initial.rating.avg, count: initial.rating.count, size: "lg", showValue: true })] }) }), initial.reviews.length === 0 && (_jsx(EmptyState, { icon: _jsx(IconShield, { className: "h-6 w-6" }), title: "No reviews yet", body: "Complete a transaction and buyers can leave you a rating." })), initial.reviews.map((r) => (_jsxs("div", { className: "rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-xs font-bold text-white", children: initials(r.reviewerName) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold text-charcoal-950", children: r.reviewerName }), r.listingTitle && _jsxs("p", { className: "text-[11px] text-charcoal-400", children: ["about \u201C", r.listingTitle, "\u201D"] })] })] }), _jsx("span", { className: "text-xs text-charcoal-400", children: formatDate(r.createdAt) })] }), _jsx("div", { className: "mt-2.5", children: _jsx(StarRating, { value: r.rating, size: "sm" }) }), r.comment && _jsx("p", { className: "mt-2 text-sm leading-relaxed text-charcoal-600", children: r.comment })] }, r.id)))] })), tab === 'payout' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "rounded-3xl border border-charcoal-100 bg-white p-6 shadow-soft", children: [_jsxs("div", { className: "flex items-start gap-4", children: [_jsx("span", { className: "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600", children: _jsx(IconBank, { className: "h-6 w-6" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-base font-extrabold text-charcoal-950", children: "Payout Settings" }), _jsxs("p", { className: "mt-1 text-sm leading-relaxed text-charcoal-500", children: ["Link your bank account to receive payouts when escrow transactions complete. TownTrade uses ", _jsx("span", { className: "font-semibold text-emerald-700", children: "Stripe Connect Express" }), " \u2014 your bank details are entered securely on Stripe\u2019s site, never in TownTrade."] })] })] }), _jsx("div", { className: "mt-5 rounded-2xl border border-charcoal-100 bg-charcoal-50/40 p-4", children: bankConnected ? (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white", children: _jsx(IconCheck, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold text-emerald-700", children: "Account Connected" }), _jsx("p", { className: "text-xs text-charcoal-400", children: "Stripe Connect Express \u00B7 payouts enabled" })] })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-charcoal-400", children: "Lifetime payouts" }), _jsx("p", { className: "text-lg font-extrabold text-emerald-600", children: formatPrice(data.paidOut) })] })] })) : (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold text-charcoal-900", children: "No payout method yet" }), _jsx("p", { className: "text-xs text-charcoal-400", children: "Payouts are sent as soon as buyers confirm delivery." })] }), _jsxs("button", { onClick: linkBank, disabled: linking || checkingPayout, className: "inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70", children: [linking && _jsx("span", { className: "h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin-slow" }), _jsx(IconBank, { className: "h-4 w-4" }), linking ? "Opening Stripe Express\u2026" : "Link Your Bank Account"] })] })) }), _jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl border border-charcoal-100 p-4", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-charcoal-400", children: "In escrow" }), _jsx("p", { className: "mt-1 text-xl font-extrabold text-charcoal-950", children: formatPrice(data.escrowValue) })] }), _jsxs("div", { className: "rounded-2xl border border-charcoal-100 p-4", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-charcoal-400", children: "Platform fee" }), _jsx("p", { className: "mt-1 text-xl font-extrabold text-charcoal-950", children: "5%" })] }), _jsxs("div", { className: "rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-emerald-700", children: "Seller receives" }), _jsx("p", { className: "mt-1 text-xl font-extrabold text-emerald-700", children: "95%" })] })] })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(IconEye, { className: "h-4 w-4 text-emerald-600" }), _jsx("p", { className: "text-sm font-semibold text-charcoal-800", children: user.locationVerified ? 'Location verified' : 'Location not yet verified' })] }), user.locationVerified ? (_jsx(VerifiedBadge, { size: "md" })) : (_jsxs("button", { onClick: verifyLocation, className: "inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95", children: [_jsx(IconShield, { className: "h-3.5 w-3.5" }), " Verify Location"] }))] })] }))] }), reviewTarget && (_jsx(ReviewModal, { revieweeName: reviewTarget.name, revieweeId: reviewTarget.id, listingId: reviewTarget.listingId, onClose: () => setReviewTarget(null), onDone: () => {
                    setReviewTarget(null);
                    router.refresh();
                } }))] }));
}
function Stat({ label, value, accent = false }) {
    return (_jsxs("div", { className: "rounded-2xl border border-charcoal-100 bg-white p-3.5", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-charcoal-400", children: label }), _jsx("p", { className: `mt-0.5 text-xl font-extrabold ${accent ? 'text-emerald-600' : 'text-charcoal-950'}`, children: value })] }));
}
function EmptyState({ icon, title, body, cta, }) {
    return (_jsxs("div", { className: "flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-charcoal-200 bg-white px-6 py-14 text-center", children: [_jsx("span", { className: "flex h-14 w-14 items-center justify-center rounded-2xl bg-charcoal-50 text-charcoal-400", children: icon }), _jsx("p", { className: "text-base font-bold text-charcoal-950", children: title }), _jsx("p", { className: "max-w-sm text-sm leading-relaxed text-charcoal-400", children: body }), cta && (_jsx(Link, { href: cta.href, className: "mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500", children: cta.label }))] }));
}
