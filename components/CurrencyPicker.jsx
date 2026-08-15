'use client';

import { useEffect, useRef, useState } from 'react';
import { CURRENCIES, CURRENCY_CODES, currencyName, currencySymbol } from '@/lib/currencies';
import { useCurrency } from './CurrencyProvider';

/**
 * Currency selector — every ISO 4217 currency in the world. The choice is
 * saved to the profile (when logged in) and to localStorage, and every price
 * on the site re-renders in the selected currency instantly.
 */
export default function CurrencyPicker() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = CURRENCY_CODES.filter(
    (code) =>
      code.includes(q.toUpperCase()) ||
      currencyName(code).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Currency: ${currency}`}
        title="Change currency"
        className="flex h-10 items-center gap-1 rounded-full px-2.5 text-sm font-bold text-charcoal-600 transition hover:bg-charcoal-50 hover:text-charcoal-950"
      >
        <span className="text-base leading-none">🌐</span>
        <span className="hidden sm:inline">{currency}</span>
        <span className="hidden text-xs text-charcoal-400 lg:inline">{currencySymbol(currency)}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-lift animate-pop-in">
          <div className="border-b border-charcoal-100 px-4 py-3">
            <p className="text-sm font-extrabold text-charcoal-950">Display currency</p>
            <p className="text-[11px] text-charcoal-400">Prices convert automatically. Payments stay in USD.</p>
          </div>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search currency or country…"
            className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-full border border-charcoal-200 bg-charcoal-50/60 px-3.5 py-2 text-sm text-charcoal-900 placeholder:text-charcoal-300 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <div className="mt-2 max-h-72 overflow-y-auto pb-2">
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-charcoal-400">No currency found.</p>
            )}
            {filtered.map((code) => (
              <button
                key={code}
                onClick={() => {
                  setCurrency(code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-emerald-50/60 ${
                  code === currency ? 'bg-emerald-50/60' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold text-charcoal-900">
                    {currencySymbol(code)} {code}
                  </span>
                  <span className="block truncate text-[11px] text-charcoal-400">{currencyName(code)}</span>
                </span>
                {code === currency && <span className="text-emerald-600">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
