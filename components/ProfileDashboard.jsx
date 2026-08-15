'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDate, formatPrice, initials } from '@/lib/format';
import { OPAY_STATUS_LABELS } from '@/lib/opay-shared';
import { useCurrency } from './CurrencyProvider';
import { useToast } from './Toaster';
import StarRating from './StarRating';
import VerifiedBadge from './VerifiedBadge';
import ReviewModal from './ReviewModal';
import SellerPayoutModal from './SellerPayoutModal';
import RefundModal from './RefundModal';
import {
  IconBank, IconCheck, IconEdit, IconEye, IconMapPin, IconShield, IconTag, IconTrash, IconUser,
} from './icons';
import { fileToDataUrl } from '@/lib/image';

const ALL_TABS = [
  { key: 'listings', label: 'My Listings' },
  { key: 'purchases', label: 'My Purchases' },
  { key: 'sales', label: 'My Sales' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'payout', label: 'Payout Settings' },
];

const HUB_TABS = {
  buyer: ['purchases', 'reviews', 'payout'],
  seller: ['listings', 'sales', 'reviews', 'payout'],
  both: ALL_TABS.map((t) => t.key),
};

export default function ProfileDashboard({ user, initial, initialTab = 'listings' }) {
  const router = useRouter();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const [tab, setTab] = useState(initialTab);
  const [hub, setHub] = useState(user.role && user.role !== 'both' ? user.role : 'both');
  const [reviewTarget, setReviewTarget] = useState(null);
  const [payoutTarget, setPayoutTarget] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);

  const data = useMemo(() => {
    const purchases = initial.purchases;
    const pending = purchases.filter((t) => t.status === 'escrow_hold');
    const escrowValue = pending.reduce((sum, t) => sum + t.amount, 0);
    const paidOut = initial.sales
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + Math.round(t.amount * 0.95), 0);
    const opayPending = (initial.sellerPayments ?? []).filter((p) => !['paid', 'refunded', 'rejected'].includes(p.status));
    return { purchases, pending, escrowValue, paidOut, opayPending };
  }, [initial]);

  const visibleTabs = ALL_TABS.filter((t) => HUB_TABS[hub].includes(t.key));
  const setTabAndUrl = (t) => {
    setTab(t);
    router.replace(t === 'listings' ? '/profile' : `/profile?tab=${t}`, { scroll: false });
  };

  // If the URL points at a tab the current hub doesn't show, land on the hub's first tab.
  useEffect(() => {
    if (!HUB_TABS[hub].includes(tab)) {
      setTabAndUrl(HUB_TABS[hub][0] ?? 'purchases');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub]);

  /* ------------------------------ role switch --------------------------- */
  const switchHub = async (next) => {
    setHub(next);
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: next }),
      });
      toast(next === 'buyer' ? 'Buyer hub active — shop the neighborhood! 🛒' : next === 'seller' ? 'Seller hub active — ready to trade! 🏪' : 'Both hubs active.');
    } catch { /* non-fatal */ }
    if (!HUB_TABS[next].includes(tab)) setTabAndUrl(HUB_TABS[next][0] ?? 'purchases');
  };

  /* ------------------------------ actions ------------------------------ */
  const deleteListing = async (listingId, title) => {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
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

  // OPay buyer: confirm delivery → admin pays the seller from the platform OPay.
  const approveOpay = async (paymentId) => {
    const res = await fetch(`/api/opay/payments/${paymentId}/approve`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || 'Could not confirm delivery.', 'error');
      return;
    }
    toast(data.message || 'Delivery confirmed! 🎉');
    router.refresh();
  };

  const [bankConnected, setBankConnected] = useState(user.bankConnected);
  const [linking, setLinking] = useState(false);
  const [checkingPayout, setCheckingPayout] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const saveAvatar = async (file) => {
    if (savingAvatar) return;
    setSavingAvatar(true);
    try {
      const avatar = await fileToDataUrl(file, 320, 0.85);
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar }),
      });
      if (!res.ok) return toast('Could not save profile picture.', 'error');
      toast('Profile picture updated! 📸');
      router.refresh();
    } catch (err) {
      toast(err.message || 'Could not read that image.', 'error');
    } finally {
      setSavingAvatar(false);
    }
  };

  useEffect(() => {
    const check = async () => {
      setCheckingPayout(true);
      try {
        const res = await fetch('/api/stripe/onboarding/status', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && typeof data.onboarded === 'boolean') setBankConnected(data.onboarded);
      } catch { /* keep current state */ } finally { setCheckingPayout(false); }
    };
    check();
    const params = new URLSearchParams(window.location.search);
    if (params.get('connect')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('connect');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const linkBank = async () => {
    if (linking) return;
    setLinking(true);
    try {
      const res = await fetch('/api/stripe/onboarding', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Could not start bank onboarding.', 'error');
        return;
      }
      window.location.href = data.url;
    } catch {
      toast('Network error. Please try again.', 'error');
    } finally {
      setLinking(false);
    }
  };

  const verifyLocation = async () => {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationVerified: true }),
    });
    if (!res.ok) return toast('Could not verify location.', 'error');
    toast('Location verified — you are now a Verified Neighbor! 🛡️');
    router.refresh();
  };

  /* ------------------------------ status pills ------------------------- */
  const opayPill = (opayStatus) => {
    const map = {
      buyer_paid: { cls: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', label: 'Paid via OPay — awaiting delivery confirmation' },
      payout_verified: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: 'Account verified — awaiting delivery' },
      buyer_approved: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: 'You confirmed delivery — admin pays the seller' },
      paid: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: 'Completed · paid to seller' },
      refund_requested: { cls: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500', label: 'Refund under review' },
      refunded: { cls: 'bg-charcoal-100 text-charcoal-600 ring-charcoal-200', dot: 'bg-charcoal-400', label: 'Refunded' },
      rejected: { cls: 'bg-charcoal-100 text-charcoal-600 ring-charcoal-200', dot: 'bg-charcoal-400', label: 'Refund declined' },
    };
    const m = map[opayStatus] ?? map.buyer_paid;
    return (
      <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${m.cls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}
      </span>
    );
  };

  /* -------------------------------- render ------------------------------ */
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
      {/* Profile header */}
      <div className="overflow-hidden rounded-3xl border border-charcoal-100 bg-white shadow-soft">
        <div className="h-24 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.fullName} className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-soft" />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-emerald-500 to-emerald-800 text-2xl font-extrabold text-white shadow-soft">
                    {initials(user.fullName)}
                  </span>
                )}
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) saveAvatar(f); }} />
                <label htmlFor="avatar-upload" title="Change profile picture" className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-xs text-white shadow-md transition hover:bg-emerald-500 active:scale-95">
                  {savingAvatar ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <span>📷</span>}
                </label>
              </div>
            </div>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-charcoal-950">{user.fullName}</h1>
                {user.locationVerified && <VerifiedBadge size="md" />}
                {user.isAdmin && <span className="rounded-full bg-charcoal-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">Admin</span>}
                {bankConnected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">
                    <IconCheck className="h-3.5 w-3.5" /> Account Connected
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-charcoal-500">
                <span className="inline-flex items-center gap-1"><IconMapPin className="h-4 w-4 text-emerald-600" /> {user.neighborhood}</span>
                <span className="text-charcoal-300">·</span>
                <span>Member since {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="pb-1"><StarRating value={initial.rating.avg} count={initial.rating.count} size="lg" showValue /></div>

          {/* Buyer / Seller hub switch */}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-charcoal-100 bg-charcoal-50/40 p-1">
            {[
              { key: 'buyer', label: '🛒 Buyer Hub' },
              { key: 'seller', label: '🏪 Seller Hub' },
              { key: 'both', label: '⚡ Both' },
            ].map((h) => (
              <button
                key={h.key}
                onClick={() => switchHub(h.key)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${hub === h.key ? 'bg-emerald-600 text-white shadow-emerald' : 'text-charcoal-600 hover:bg-white hover:text-charcoal-950'}`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 px-6 pb-6 sm:grid-cols-4">
          <Stat label="Active listings" value={initial.listings.filter((l) => l.status === 'active').length} />
          <Stat label="In escrow" value={data.pending.length} accent />
          <Stat label="Purchases" value={initial.purchases.length} />
          <Stat label="Sales" value={initial.sales.length} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-charcoal-100 bg-white p-1 shadow-soft">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTabAndUrl(t.key)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${tab === t.key ? 'bg-charcoal-950 text-white shadow-sm' : 'text-charcoal-600 hover:bg-charcoal-50 hover:text-charcoal-950'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* ------------------------------ LISTINGS --------------------------- */}
        {tab === 'listings' && (
          <div className="space-y-3">
            {initial.listings.length === 0 && (
              <EmptyState icon={<IconTag className="h-6 w-6" />} title="No listings yet" body="Post your first item or service and it will show up here." cta={{ href: '/listing/new', label: 'Post a Listing' }} />
            )}
            {initial.listings.map((l) => (
              <div key={l.id} className="flex flex-col gap-4 rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft transition hover:border-emerald-200 sm:flex-row sm:items-center">
                <Link href={`/listing/${l.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  {l.image ? <img src={l.image} alt={l.title} className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">🏷️</span>}
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-charcoal-950">{l.title}</span>
                      {l.status === 'sold' ? (
                        <span className="rounded-full bg-charcoal-100 px-2 py-0.5 text-[10px] font-bold text-charcoal-600">Sold</span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">Active</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm text-charcoal-400">{formatPrice(l.price, currency)} · {l.seller.neighborhood}</span>
                  </span>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/listing/${l.id}/edit`} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95">
                    <IconEdit className="h-3.5 w-3.5" /> Edit
                  </Link>
                  <button onClick={() => deleteListing(l.id, l.title)} className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-charcoal-800 active:scale-95">
                    <IconTrash className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ----------------------------- PURCHASES --------------------------- */}
        {tab === 'purchases' && (
          <div className="space-y-3">
            {initial.purchases.length === 0 && (
              <EmptyState icon={<IconUser className="h-6 w-6" />} title="No purchases yet" body="When you buy something with Buy Now, it shows up here — held in escrow until you confirm delivery." cta={{ href: '/marketplace', label: 'Browse Marketplace' }} />
            )}
            {initial.purchases.map((t) => (
              <div key={t.id} className="rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Link href={`/listing/${t.listingId}`} className="flex min-w-0 flex-1 items-center gap-4">
                    {t.listingImage ? <img src={t.listingImage} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-charcoal-50 text-2xl">🛍️</span>}
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-bold text-charcoal-950">{t.listingTitle}</span>
                        {t.paymentMethod === 'opay' && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">OPay</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-charcoal-400">from {t.counterpartyName} · {formatPrice(t.amount, currency)} · {formatDate(t.createdAt)}</span>
                      {t.paymentMethod === 'opay' ? (
                        opayPill(t.opayStatus)
                      ) : t.status === 'escrow_hold' ? (
                        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> In Escrow — awaiting delivery confirmation
                        </span>
                      ) : (
                        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <IconCheck className="h-3 w-3" /> Completed · {formatDate(t.completedAt ?? t.createdAt)}
                        </span>
                      )}
                    </span>
                  </Link>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {t.paymentMethod === 'opay' ? (
                      <>
                        {['buyer_paid', 'payout_verified'].includes(t.opayStatus) && (
                          <button onClick={() => approveOpay(t.opayPaymentId)} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95">
                            <IconCheck className="h-3.5 w-3.5" /> Confirm Delivery / Release Funds
                          </button>
                        )}
                        {['buyer_paid', 'payout_verified', 'buyer_approved'].includes(t.opayStatus) && (
                          <button onClick={() => setRefundTarget({ id: t.opayPaymentId, listingTitle: t.listingTitle, amount: t.amount })} className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-amber-600 active:scale-95">
                            ↩️ Request Refund
                          </button>
                        )}
                        {t.opayStatus === 'paid' && !t.reviewGiven && (
                          <button onClick={() => setReviewTarget({ id: t.counterpartyId, name: t.counterpartyName, listingId: t.listingId })} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100 active:scale-95">
                            ⭐ Rate {t.counterpartyName.split(' ')[0]}
                          </button>
                        )}
                      </>
                    ) : t.status === 'escrow_hold' ? (
                      <button onClick={() => releaseFunds(t.id)} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95">
                        <IconCheck className="h-3.5 w-3.5" /> Confirm Delivery / Release Funds
                      </button>
                    ) : t.status === 'completed' && !t.reviewGiven ? (
                      <button onClick={() => setReviewTarget({ id: t.counterpartyId, name: t.counterpartyName, listingId: t.listingId })} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100 active:scale-95">
                        ⭐ Rate {t.counterpartyName.split(' ')[0]}
                      </button>
                    ) : t.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-charcoal-50 px-3 py-2 text-xs font-semibold text-charcoal-500">✓ Reviewed</span>
                    ) : null}
                  </div>
                </div>
                {t.paymentMethod === 'opay' && t.opayStatus === 'buyer_paid' && t.amount > 0 && (
                  <p className="mt-3 rounded-xl bg-charcoal-50/60 px-3.5 py-2.5 text-xs leading-relaxed text-charcoal-500">
                    💰 <span className="font-bold text-charcoal-800">{formatPrice(t.amount, currency)}</span> is locked in escrow. The seller will add their payout account, then you confirm delivery — 95% goes to the seller, 5% is the TownTrade fee.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* -------------------------------- SALES ----------------------------- */}
        {tab === 'sales' && (
          <div className="space-y-3">
            {initial.sales.length === 0 && (
              <EmptyState icon={<IconTag className="h-6 w-6" />} title="No sales yet" body="When a neighbor buys one of your listings, it appears here." />
            )}
            {initial.sales.map((t) => (
              <div key={t.id} className="flex flex-col gap-4 rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
                {t.listingImage ? <img src={t.listingImage} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-charcoal-50 text-2xl">📦</span>}
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 truncate text-sm font-bold text-charcoal-950">
                    {t.listingTitle}
                    {t.paymentMethod === 'opay' && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">OPay</span>}
                  </p>
                  <p className="text-xs text-charcoal-400">Sold to {t.counterpartyName} · {formatPrice(t.amount, currency)} · {formatDate(t.createdAt)}</p>
                  {t.paymentMethod === 'opay' ? (
                    (() => {
                      const m = {
                        buyer_paid: { cls: 'bg-amber-50 text-amber-700 ring-amber-200', label: 'Buyer paid via OPay — add your payout account' },
                        payout_verified: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Account verified — awaiting buyer delivery confirmation' },
                        buyer_approved: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Buyer confirmed — awaiting admin transfer' },
                        paid: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Paid out · 95% sent to you' },
                        refund_requested: { cls: 'bg-red-50 text-red-700 ring-red-200', label: 'Buyer requested a refund' },
                        refunded: { cls: 'bg-charcoal-100 text-charcoal-600 ring-charcoal-200', label: 'Refunded' },
                        rejected: { cls: 'bg-charcoal-100 text-charcoal-600 ring-charcoal-200', label: 'Refund declined' },
                      };
                      const x = m[t.opayStatus] ?? m.buyer_paid;
                      return <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${x.cls}`}>{x.label}</span>;
                    })()
                  ) : t.status === 'escrow_hold' ? (
                    <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {formatPrice(t.amount, currency)} pending in escrow
                    </span>
                  ) : (
                    <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <IconCheck className="h-3 w-3" /> Paid out {formatPrice(Math.round(t.amount * 0.95), currency)}
                    </span>
                  )}
                </div>
                {t.paymentMethod === 'opay' && t.opayStatus === 'buyer_paid' && (
                  <button
                    onClick={() => setPayoutTarget({ paymentId: t.opayPaymentId, amount: t.amount, listingTitle: t.listingTitle, sellerName: user.fullName })}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95"
                  >
                    <IconBank className="h-3.5 w-3.5" /> Add Payout Account
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ------------------------------- REVIEWS ---------------------------- */}
        {tab === 'reviews' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-charcoal-100 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-charcoal-950">Neighbor reputation</p>
                  <p className="text-xs text-charcoal-400">Ratings from completed transactions</p>
                </div>
                <StarRating value={initial.rating.avg} count={initial.rating.count} size="lg" showValue />
              </div>
            </div>
            {initial.reviews.length === 0 && (
              <EmptyState icon={<IconShield className="h-6 w-6" />} title="No reviews yet" body="Complete a transaction and buyers can leave you a rating." />
            )}
            {initial.reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {r.reviewerAvatar ? <img src={r.reviewerAvatar} alt={r.reviewerName} className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-xs font-bold text-white">{initials(r.reviewerName)}</span>}
                    <div>
                      <p className="text-sm font-bold text-charcoal-950">{r.reviewerName}</p>
                      {r.listingTitle && <p className="text-[11px] text-charcoal-400">about “{r.listingTitle}”</p>}
                    </div>
                  </div>
                  <span className="text-xs text-charcoal-400">{formatDate(r.createdAt)}</span>
                </div>
                <div className="mt-2.5"><StarRating value={r.rating} size="sm" /></div>
                {r.comment && <p className="mt-2 text-sm leading-relaxed text-charcoal-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ------------------------------- PAYOUT ----------------------------- */}
        {tab === 'payout' && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-charcoal-100 bg-white p-6 shadow-soft">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600"><IconBank className="h-6 w-6" /></span>
                <div className="flex-1">
                  <h3 className="text-base font-extrabold text-charcoal-950">Payout Settings</h3>
                  <p className="mt-1 text-sm leading-relaxed text-charcoal-500">
                    Receiving payouts is easy two ways: <span className="font-semibold text-emerald-700">Stripe Connect Express</span> for international
                    card payments, or your <span className="font-semibold text-emerald-700">local OPay account</span> for payments buyers made via bank transfer.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-charcoal-100 bg-charcoal-50/40 p-4">
                {bankConnected ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><IconCheck className="h-5 w-5" /></span>
                      <div>
                        <p className="text-sm font-bold text-emerald-700">Account Connected</p>
                        <p className="text-xs text-charcoal-400">Stripe Connect Express · payouts enabled</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-400">Lifetime payouts</p>
                      <p className="text-lg font-extrabold text-emerald-600">{formatPrice(data.paidOut, currency)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-charcoal-900">No Stripe payout method yet</p>
                      <p className="text-xs text-charcoal-400">Payouts for card payments are sent as soon as buyers confirm delivery.</p>
                    </div>
                    <button onClick={linkBank} disabled={linking || checkingPayout} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70">
                      {linking && <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin-slow" />}
                      <IconBank className="h-4 w-4" /> {linking ? 'Opening Stripe Express…' : 'Link Your Bank Account'}
                    </button>
                  </div>
                )}
              </div>

              {/* Local OPay payouts */}
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-emerald-800">OPay local payouts</p>
                    <p className="text-xs text-emerald-700/80">
                      {data.opayPending.length > 0
                        ? `${data.opayPending.length} payment${data.opayPending.length > 1 ? 's' : ''} waiting on you.`
                        : 'All caught up — no pending local payouts.'}
                    </p>
                  </div>
                  <span className="text-lg">🏦</span>
                </div>
                {data.opayPending.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {(initial.sellerPayments ?? []).map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-charcoal-900">{p.listingTitle}</p>
                          <p className="text-[11px] text-charcoal-400">{formatPrice(p.amount, currency)} · {OPAY_STATUS_LABELS[p.status] ?? p.status}</p>
                        </div>
                        {p.status === 'buyer_paid' ? (
                          <button
                            onClick={() => setPayoutTarget({ paymentId: p.id, amount: p.amount, listingTitle: p.listingTitle, sellerName: user.fullName })}
                            className="shrink-0 rounded-full bg-emerald-600 px-3.5 py-2 text-[11px] font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95"
                          >
                            Add Account →
                          </button>
                        ) : (
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${p.status === 'buyer_approved' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {p.status === 'buyer_approved' ? 'Awaiting admin transfer' : 'Verified'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-charcoal-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-400">In escrow</p>
                  <p className="mt-1 text-xl font-extrabold text-charcoal-950">{formatPrice(data.escrowValue, currency)}</p>
                </div>
                <div className="rounded-2xl border border-charcoal-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-400">Platform fee</p>
                  <p className="mt-1 text-xl font-extrabold text-charcoal-950">5%</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Seller receives</p>
                  <p className="mt-1 text-xl font-extrabold text-emerald-700">95%</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-charcoal-100 bg-white p-4 shadow-soft">
              <div className="flex items-center gap-2.5">
                <IconEye className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-semibold text-charcoal-800">{user.locationVerified ? 'Location verified' : 'Location not yet verified'}</p>
              </div>
              {user.locationVerified ? <VerifiedBadge size="md" /> : (
                <button onClick={verifyLocation} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95">
                  <IconShield className="h-3.5 w-3.5" /> Verify Location
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {payoutTarget && (
        <SellerPayoutModal
          payment={payoutTarget}
          onClose={() => setPayoutTarget(null)}
          onDone={() => router.refresh()}
        />
      )}
      {refundTarget && (
        <RefundModal payment={refundTarget} onClose={() => setRefundTarget(null)} />
      )}
      {reviewTarget && (
        <ReviewModal
          revieweeName={reviewTarget.name}
          revieweeId={reviewTarget.id}
          listingId={reviewTarget.listingId}
          onClose={() => setReviewTarget(null)}
          onDone={() => { setReviewTarget(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent = false }) {
  return (
    <div className="rounded-2xl border border-charcoal-100 bg-white p-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-400">{label}</p>
      <p className={`mt-0.5 text-xl font-extrabold ${accent ? 'text-emerald-600' : 'text-charcoal-950'}`}>{value}</p>
    </div>
  );
}

function EmptyState({ icon, title, body, cta }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-charcoal-200 bg-white px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-charcoal-50 text-charcoal-400">{icon}</span>
      <p className="text-base font-bold text-charcoal-950">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-charcoal-400">{body}</p>
      {cta && (
        <Link href={cta.href} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
