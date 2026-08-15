'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { isCurrency } from '@/lib/currencies';

const CurrencyContext = createContext({ currency: 'USD', setCurrency: () => {}, ready: false });

/** Read the user's preferred display currency (ISO code, defaults to USD). */
export function useCurrency() {
  return useContext(CurrencyContext);
}

/** Fallback currency guessed from the browser locale. */
function localeDefault() {
  try {
    const lang = (navigator.language || 'en-US').split('-')[0];
    const map = {
      en: 'USD', fr: 'EUR', de: 'EUR', es: 'EUR', it: 'EUR', nl: 'EUR', pt: 'EUR',
      pl: 'PLN', ja: 'JPY', zh: 'CNY', hi: 'INR', id: 'IDR', tr: 'TRY', vi: 'VND',
      th: 'THB', ko: 'KRW', ar: 'AED', sw: 'KES', yo: 'NGN', ig: 'NGN', ha: 'NGN',
      ro: 'RON', hu: 'HUF', cs: 'CZK', da: 'DKK', sv: 'SEK', no: 'NOK', fi: 'EUR',
      el: 'EUR', bg: 'BGN', hr: 'HRK', sk: 'EUR', sl: 'EUR', lt: 'EUR', lv: 'EUR',
      et: 'EUR', mt: 'EUR', ga: 'EUR', ru: 'RUB', uk: 'UAH', ms: 'MYR', fil: 'PHP',
      bn: 'BDT', ur: 'PKR', ta: 'INR', te: 'INR', mr: 'INR', gu: 'INR',
    };
    return map[lang] || 'USD';
  } catch {
    return 'USD';
  }
}

/**
 * Provides the display currency for the whole app. Priority:
 *   1. The logged-in user's saved preference (fetched once on mount)
 *   2. localStorage (persists the guest's choice across visits)
 *   3. A guess from the browser locale
 * Changing the currency re-renders every consumer immediately and persists it.
 */
export default function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState('USD');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tt_currency');
      if (saved && isCurrency(saved)) setCurrencyState(saved.toUpperCase());
      else setCurrencyState(localeDefault());
    } catch { /* private mode */ }
    setReady(true);
    // Sync with the logged-in user's saved preference (best-effort).
    (async () => {
      try {
        const res = await fetch('/api/users/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.user && isCurrency(data.user.currency)) {
            setCurrencyState(data.user.currency);
            try { localStorage.setItem('tt_currency', data.user.currency); } catch { /* ignore */ }
          }
        }
      } catch { /* offline */ }
    })();
  }, []);

  const setCurrency = (code) => {
    const next = isCurrency(code) ? code.toUpperCase() : 'USD';
    setCurrencyState(next);
    try { localStorage.setItem('tt_currency', next); } catch { /* ignore */ }
    try {
      fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: next }),
      }).catch(() => {});
    } catch { /* offline */ }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, ready }}>
      {children}
    </CurrencyContext.Provider>
  );
}
