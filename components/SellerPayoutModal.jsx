'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/format';
import { useToast } from './Toaster';
import { IconShield, IconX } from './icons';

/**
 * Seller payout modal: the seller enters the account number they want the
 * OPay payout sent to. The Safety Bot verifies the account-holder name against
 * the seller's TownTrade profile name before the details go to the admin.
 */
export default function SellerPayoutModal({ payment, onClose, onDone }) {
  const { toast } = useToast();
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (accountNumber.replace(/\s/g, '').length < 8) {
      return setError('Please enter a valid account number (8–12 digits).');
    }
    if (accountHolder.trim().length < 2) {
      return setError('Please enter the name on the account.');
    }
    setBusy(true);
    try {
      const res = await fetch('/api/opay/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment.id, accountNumber, accountHolder }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit payout details.');
        return;
      }
      toast('Account verified by the Safety Bot — payout details sent to the admin! ✅');
      onDone?.();
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

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

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <IconShield className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight text-charcoal-950">Receive your payout</h2>
            <p className="text-xs text-charcoal-400">{payment.listingTitle} · {formatPrice(payment.amount)}</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs leading-relaxed text-emerald-800">
            <span className="font-bold">Safety Bot verification:</span> the name you enter will be checked against your
            TownTrade profile name before your details are sent to the admin. Enter the exact name on your account.
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-charcoal-900">Account Number</label>
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d\s]/g, ''))}
              inputMode="numeric"
              placeholder="e.g. 8121345678"
              className="w-full rounded-xl border border-charcoal-200 bg-white px-4 py-2.5 text-sm tracking-widest text-charcoal-900 placeholder:tracking-normal placeholder:text-charcoal-300 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-charcoal-900">Name on the Account</label>
            <input
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="e.g. Mia Chen"
              className="w-full rounded-xl border border-charcoal-200 bg-white px-4 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-300 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="mt-1 text-xs text-charcoal-400">Must match your TownTrade profile name: <span className="font-semibold text-charcoal-600">{payment.sellerName}</span></p>
          </div>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-full border border-charcoal-200 px-5 py-3 text-sm font-bold text-charcoal-700 transition hover:bg-charcoal-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
              {busy && <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin-slow" />}
              {busy ? 'Verifying…' : 'Verify & Send to Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
