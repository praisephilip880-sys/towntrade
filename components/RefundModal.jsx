'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/format';
import { REFUND_QUESTIONS } from '@/lib/opay-shared';
import { useCurrency } from './CurrencyProvider';
import { useToast } from './Toaster';
import { IconShield, IconX } from './icons';

/**
 * Refund flow: the Safety Bot asks up to 5 short questions (max 5) to verify
 * the claim, then the request + answers go to the admin for review.
 */
export default function RefundModal({ payment, onClose }) {
  const router = useRouter();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [describe, setDescribe] = useState('');
  const [refundAccount, setRefundAccount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const current = REFUND_QUESTIONS[step];

  const choose = (option) => {
    const next = [...answers, { q: current.q, a: option }];
    setAnswers(next);
    if (step < REFUND_QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      submitRefund(next);
    }
  };

  const submitRefund = async (allAnswers) => {
    if (describe.trim().length < 5) {
      setError('Please describe what went wrong (at least 5 characters).');
      return;
    }
    if (refundAccount.replace(/\s/g, '').length < 8) {
      setError('Please enter the account number for the refund (8–12 digits).');
      return;
    }
    const finalAnswers = [...allAnswers, { q: current.q, a: describe.trim() }];
    setBusy(true);
    try {
      const res = await fetch(`/api/opay/payments/${payment.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: finalAnswers.map((a) => `${a.q} → ${a.a}`).join(' | '),
          botAnswers: finalAnswers,
          refundAccount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit the refund request.');
        setBusy(false);
        return;
      }
      setDone(true);
      toast('Refund request submitted — the admin will review it shortly.');
    } catch {
      setError('Network error. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-charcoal-950/50 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-lift animate-pop-in sm:p-7">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-charcoal-400 transition hover:bg-charcoal-50 hover:text-charcoal-700">
          <IconX className="h-4 w-4" />
        </button>

        {done ? (
          <div className="py-4 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">🤝</span>
            <h2 className="mt-4 text-xl font-black tracking-tight text-charcoal-950">Refund request sent!</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-charcoal-500">
              The Safety Bot answers and your reason are now with the admin. You will get a notification once it is
              reviewed. If you paid by OPay, the refund is sent back to the account you paid from.
            </p>
            <button
              onClick={() => { onClose(); router.push('/profile?tab=purchases'); }}
              className="mt-6 w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500"
            >
              Back to My Purchases
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <IconShield className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black tracking-tight text-charcoal-950">Request a refund</h2>
                <p className="text-xs text-charcoal-400">
                  {payment.listingTitle} · {formatPrice(payment.amount, currency)} · Question {step + 1} of {REFUND_QUESTIONS.length}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              {REFUND_QUESTIONS.map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-emerald-500' : 'bg-charcoal-100'}`} />
              ))}
            </div>

            <p className="mt-5 text-sm font-extrabold text-charcoal-950">{current.q}</p>

            {current.options.length > 0 ? (
              <div className="mt-4 space-y-2">
                {current.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => choose(opt)}
                    className="w-full rounded-2xl border-2 border-charcoal-200 bg-white px-4 py-3 text-left text-sm font-bold text-charcoal-800 transition hover:border-emerald-500 hover:bg-emerald-50/40"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <textarea
                  value={describe}
                  onChange={(e) => setDescribe(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Tell us what went wrong…"
                  className="mt-4 w-full resize-none rounded-2xl border border-charcoal-200 bg-white px-4 py-3 text-sm leading-relaxed text-charcoal-900 placeholder:text-charcoal-300 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <input
                  value={refundAccount}
                  onChange={(e) => setRefundAccount(e.target.value.replace(/[^\d\s]/g, ''))}
                  inputMode="numeric"
                  placeholder="Account number to refund to (e.g. 8121344178)"
                  className="mt-3 w-full rounded-xl border border-charcoal-200 bg-white px-4 py-2.5 text-sm tracking-widest text-charcoal-900 placeholder:tracking-normal placeholder:text-charcoal-300 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setStep(step - 1)}
                    disabled={busy}
                    className="rounded-full border border-charcoal-200 px-5 py-3 text-sm font-bold text-charcoal-700 transition hover:bg-charcoal-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => submitRefund(answers)}
                    disabled={busy || describe.trim().length < 5}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy && <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin-slow" />}
                    Submit Refund Request
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
