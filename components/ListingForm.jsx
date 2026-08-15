'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, CATEGORY_EMOJIS, CATEGORY_LABELS } from '@/lib/types';
import { MAX_IMAGES } from '@/lib/image';
import { convertFromUsdCents, convertToUsdCents, currencyName, currencySymbol } from '@/lib/currencies';
import { formatPrice } from '@/lib/format';
import { useCurrency } from './CurrencyProvider';
import { useToast } from './Toaster';
import ImageUploader from './ImageUploader';

/** Max listing price in USD cents ($100,000) and min ($0.50). */
const MAX_USD_CENTS = 10_000_000;
const MIN_USD_CENTS = 50;

export default function ListingForm({ mode, listingId, initial }) {
  const router = useRouter();
  const { toast } = useToast();
  const { currency, ready } = useCurrency();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState('');
  const [priceTouched, setPriceTouched] = useState(false);
  const [category, setCategory] = useState(initial?.category ?? 'items');
  const [images, setImages] = useState(initial?.images ?? []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isFree = category === 'free';
  const sym = currencySymbol(currency);

  // On edit: show the stored price in the user's currency, re-converting
  // whenever the currency changes (as long as they haven't typed a new one).
  useEffect(() => {
    if (initial && !priceTouched && ready) {
      setPrice(String(convertFromUsdCents(initial.price, currency)));
    }
  }, [currency, ready, initial, priceTouched]);

  const enteredUsdCents = (() => {
    const n = Number(price);
    if (isFree || !price || isNaN(n) || n <= 0) return 0;
    return convertToUsdCents(n, currency);
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (title.trim().length < 3) return setError('Title must be at least 3 characters.');
    if (description.trim().length < 10) return setError('Description must be at least 10 characters.');
    if (!isFree) {
      const n = Number(price);
      if (isNaN(n) || n <= 0) return setError(`Please enter a valid price in ${currency}.`);
      if (enteredUsdCents < MIN_USD_CENTS) {
        return setError(`That price is too low — the minimum is ${formatPrice(MIN_USD_CENTS, 'USD')} USD.`);
      }
      if (enteredUsdCents > MAX_USD_CENTS) {
        return setError(`That price looks too high — the maximum is ${formatPrice(MAX_USD_CENTS, 'USD')} USD.`);
      }
    }
    if (images.length === 0) return setError('Please add at least one photo.');
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        // Price is always stored as USD cents. The user types in their own
        // currency; we convert here so every currency works.
        price: isFree ? 0 : enteredUsdCents,
        category,
        images,
      };
      const res = await fetch(mode === 'create' ? '/api/listings' : `/api/listings/${listingId}`, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) return router.push('/#auth');
        setError(data.error || 'Something went wrong.');
        return;
      }
      toast(mode === 'create' ? 'Listing published to your neighborhood! 🎉' : 'Listing updated successfully.');
      router.push(`/listing/${data.listing.id}`);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-charcoal-200 bg-white px-4 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-300 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-bold text-charcoal-900">Category</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`flex items-center gap-2.5 rounded-2xl border-2 px-4 py-3 text-left transition ${active ? 'border-emerald-500 bg-emerald-50' : 'border-charcoal-200 bg-white hover:border-charcoal-300'}`}
              >
                <span className="text-xl">{CATEGORY_EMOJIS[c]}</span>
                <span>
                  <span className={`block text-sm font-bold ${active ? 'text-emerald-700' : 'text-charcoal-900'}`}>{CATEGORY_LABELS[c]}</span>
                  <span className="block text-xs text-charcoal-400">{c === 'items' ? 'Sell something you own' : c === 'gigs' ? 'Offer a local service' : 'Give it away free'}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="lf-title" className="mb-1.5 block text-sm font-bold text-charcoal-900">Title</label>
        <input id="lf-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you listing?" className={inputCls} />
      </div>

      <div>
        <label htmlFor="lf-desc" className="mb-1.5 block text-sm font-bold text-charcoal-900">Description</label>
        <textarea id="lf-desc" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Condition, pickup details, what makes it great…" className={`${inputCls} resize-none leading-relaxed`} />
        <p className="mt-1 text-right text-xs text-charcoal-400">{description.length}/2000</p>
      </div>

      <div>
        <label htmlFor="lf-price" className="mb-1.5 block text-sm font-bold text-charcoal-900">
          {isFree ? 'Price' : `Price (${currency} — ${currencyName(currency)})`}
        </label>
        {isFree ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            🎁 Free listing — buyers claim it with no payment.
          </div>
        ) : (
          <div>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-charcoal-400">{sym}</span>
              <input
                id="lf-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => { setPrice(e.target.value); setPriceTouched(true); }}
                placeholder="0.00"
                className={`${inputCls} pl-8`}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal-400">
              {enteredUsdCents > 0 && (
                <span className="font-semibold text-emerald-700">
                  ≈ {formatPrice(enteredUsdCents, 'USD')} USD
                  {currency !== 'USD' ? ` (buyers see ${formatPrice(enteredUsdCents, currency)})` : ''}
                </span>
              )}
              <span>Change currency with the 🌐 picker in the top bar.</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-charcoal-900">Photos ({images.length}/{MAX_IMAGES})</label>
        <ImageUploader images={images} onChange={setImages} />
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => router.back()} className="rounded-full border border-charcoal-200 px-5 py-3 text-sm font-bold text-charcoal-700 transition hover:bg-charcoal-50">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
          {loading && <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin-slow" />}
          {mode === 'create' ? 'Publish Listing' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
