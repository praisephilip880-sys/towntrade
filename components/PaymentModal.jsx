'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/format';
import { OPAY_ACCOUNT, ngnEstimate } from '@/lib/opay-shared';
import { useToast } from './Toaster';
import { IconCard, IconCheck, IconShield, IconX } from './icons';

/**
 * Buy Now flow: the buyer picks how to pay —
 *   • Card (Stripe Checkout, escrow protected)
 *   • OPay local transfer (pay the platform account, then confirm)
 */
export default function PaymentModal({ listing, onClose }) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState('choose'); // choose | opay | success
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);

  const payByCard = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) return router.push('/#auth');
        toast(data.error || 'Could not start secure checkout.', 'error');
        return;
      }
      window.location.href = data.url;
    } catch {
      toast('Network error. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const payByOpay = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/opay/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Could not confirm your transfer.', 'error');
        return;
      }
      setResult(data);
      setStep('success');
      toast('Transfer recorded — your payment is now in escrow! 🎉');
    } catch {
      toast('Network error. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(OPAY_ACCOUNT.number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  const usd = formatPrice(listing.price);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-charcoal-950/50 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-lift animate-pop-in sm:p-7">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-charcoal-400 transition hover:bg-charcoal-50 hover:text-charcoal-700"
        >
          <IconX className="h-4 w-4" />
        </button>

        {step === 'choose' && (
          <>
            <div className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Secure checkout</div>
            <h2 className="text-xl font-black tracking-tight text-charcoal-950">{listing.title}</h2>
            <p className="mt-1 text-sm text-charcoal-400">
              {usd} · escrow-protected — funds release to the seller only after you confirm delivery.
            </p>

            <div className="mt-5 space-y-3">
              <button
                onClick={payByCard}
                disabled={busy}
                className="group flex w-full items-center gap-4 rounded-2xl border-2 border-charcoal-200 bg-white p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50/40 disabled:opacity-60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
                  <IconCard className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-charcoal-950">Pay with Card (Stripe)</span>
                  <span className="block text-xs text-charcoal-400">Instant · test card 4242 4242 4242 4242</span>
                </span>
                <span className="text-xs font-bold text-emerald-600 group-hover:underline">Continue →</span>
              </button>

              <button
                onClick={() => setStep('opay')}
                className="group flex w-full items-center gap-4 rounded-2xl border-2 border-charcoal-200 bg-white p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50/40"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xl transition group-hover:bg-emerald-600">🏦</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-charcoal-950">Pay with OPay (Local Transfer)</span>
                  <span className="block text-xs text-charcoal-400">No card needed · pay ~₦{ngnEstimate(listing.price).toLocaleString()} to the platform account</span>
                </span>
                <span className="text-xs font-bold text-emerald-600 group-hover:underline">Continue →</span>
              </button>
            </div>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-charcoal-400">
              <IconShield className="h-3.5 w-3.5 text-emerald-600" /> Your money is held in escrow until you confirm delivery
            </p>
          </>
        )}

        {step === 'opay' && (
          <>
            <div className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Pay with OPay</div>
            <h2 className="text-xl font-black tracking-tight text-charcoal-950">{listing.title}</h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-charcoal-100 bg-charcoal-50/50 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-charcoal-400">Amount</p>
                <p className="mt-0.5 text-lg font-black text-charcoal-950">{usd}</p>
                <p className="text-xs font-bold text-emerald-700">≈ ₦{ngnEstimate(listing.price).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Escrow</p>
                <p className="mt-0.5 text-lg font-black text-emerald-700">Protected</p>
                <p className="text-xs text-emerald-700/70">released on delivery</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-charcoal-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-charcoal-400">Transfer to this OPay account</p>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-charcoal-50 px-4 py-3">
                <div>
                  <p className="text-lg font-black tracking-wide text-charcoal-950">{OPAY_ACCOUNT.number}</p>
                  <p className="text-xs text-charcoal-400">
                    {OPAY_ACCOUNT.name} · {OPAY_ACCOUNT.bank}
                  </p>
                </div>
                <button
                  onClick={copyAccount}
                  className="shrink-0 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-95"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <ol className="mt-3 space-y-1.5 text-xs leading-relaxed text-charcoal-500">
                <li>1. Open your OPay app and transfer <span className="font-bold text-charcoal-800">₦{ngnEstimate(listing.price).toLocaleString()}</span> to the account above.</li>
                <li>2. Come back here and press “I have made the transfer”.</li>
                <li>3. The seller is notified — your money is held safely until you confirm delivery.</li>
              </ol>
            </div>

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Optional: transaction reference / note for the admin"
              className="mt-3 w-full rounded-xl border border-charcoal-200 bg-white px-4 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-300 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setStep('choose')}
                disabled={busy}
                className="rounded-full border border-charcoal-200 px-5 py-3 text-sm font-bold text-charcoal-700 transition hover:bg-charcoal-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={payByOpay}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy && <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin-slow" />}
                {busy ? 'Recording transfer…' : 'I have made the transfer ✓'}
              </button>
            </div>
          </>
        )}

        {step === 'success' && result && (
          <div className="py-4 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <IconCheck className="h-8 w-8" />
            </span>
            <h2 className="mt-4 text-xl font-black tracking-tight text-charcoal-950">Payment in escrow! 🎉</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-charcoal-500">
              Your payment of <span className="font-bold text-emerald-700">{formatPrice(result.amount)}</span> is safely held.
              The seller has been notified and will add their payout details. Once you receive the item, confirm delivery
              and the seller gets paid — 95% of your money goes to them, 5% is the TownTrade fee.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { onClose(); router.push('/profile?tab=purchases'); }}
                className="flex-1 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98]"
              >
                View My Purchases
              </button>
              <button
                onClick={onClose}
                className="rounded-full border border-charcoal-200 px-5 py-3 text-sm font-bold text-charcoal-700 transition hover:bg-charcoal-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
