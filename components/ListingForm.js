'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, CATEGORY_EMOJIS, CATEGORY_LABELS } from '@/lib/types';
import { MAX_IMAGES } from '@/lib/image';
import { useToast } from './Toaster';
import ImageUploader from './ImageUploader';
export default function ListingForm({ mode, listingId, initial }) {
    const router = useRouter();
    const { toast } = useToast();
    const [title, setTitle] = useState(initial?.title ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [price, setPrice] = useState(initial ? String(initial.price / 100) : '');
    const [category, setCategory] = useState(initial?.category ?? 'items');
    const [images, setImages] = useState(initial?.images ?? []);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const isFree = category === 'free';
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (title.trim().length < 3)
            return setError('Title must be at least 3 characters.');
        if (description.trim().length < 10)
            return setError('Description must be at least 10 characters.');
        if (!isFree) {
            const p = Number(price);
            if (isNaN(p) || p < 0)
                return setError('Please enter a valid price.');
            if (p > 100000)
                return setError('Price looks too high.');
        }
        if (images.length === 0)
            return setError('Please add at least one photo.');
        setLoading(true);
        try {
            const payload = {
                title: title.trim(),
                description: description.trim(),
                price: isFree ? 0 : Math.round(Number(price) * 100),
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
                if (res.status === 401)
                    return router.push('/#auth');
                setError(data.error || 'Something went wrong.');
                return;
            }
            toast(mode === 'create' ? 'Listing published to your neighborhood! 🎉' : 'Listing updated successfully.');
            router.push(`/listing/${data.listing.id}`);
            router.refresh();
        }
        catch {
            setError('Network error. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    const inputCls = 'w-full rounded-xl border border-charcoal-200 bg-white px-4 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-300 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-2 block text-sm font-bold text-charcoal-900", children: "Category" }), _jsx("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-3", children: CATEGORIES.map((c) => {
                            const active = category === c;
                            return (_jsxs("button", { type: "button", onClick: () => setCategory(c), className: `flex items-center gap-2.5 rounded-2xl border-2 px-4 py-3 text-left transition ${active ? 'border-emerald-500 bg-emerald-50' : 'border-charcoal-200 bg-white hover:border-charcoal-300'}`, children: [_jsx("span", { className: "text-xl", children: CATEGORY_EMOJIS[c] }), _jsxs("span", { children: [_jsx("span", { className: `block text-sm font-bold ${active ? 'text-emerald-700' : 'text-charcoal-900'}`, children: CATEGORY_LABELS[c] }), _jsx("span", { className: "block text-xs text-charcoal-400", children: c === 'items' ? 'Sell something you own' : c === 'gigs' ? 'Offer a local service' : 'Give it away free' })] })] }, c));
                        }) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "lf-title", className: "mb-1.5 block text-sm font-bold text-charcoal-900", children: "Title" }), _jsx("input", { id: "lf-title", type: "text", value: title, onChange: (e) => setTitle(e.target.value), placeholder: "What are you listing?", className: inputCls })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "lf-desc", className: "mb-1.5 block text-sm font-bold text-charcoal-900", children: "Description" }), _jsx("textarea", { id: "lf-desc", rows: 5, value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Condition, pickup details, what makes it great\u2026", className: `${inputCls} resize-none leading-relaxed` }), _jsxs("p", { className: "mt-1 text-right text-xs text-charcoal-400", children: [description.length, "/2000"] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "lf-price", className: "mb-1.5 block text-sm font-bold text-charcoal-900", children: isFree ? 'Price' : 'Price (USD)' }), isFree ? (_jsx("div", { className: "flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200", children: "\uD83C\uDF81 Free listing \u2014 buyers claim it with no payment." })) : (_jsxs("div", { className: "relative", children: [_jsx("span", { className: "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-charcoal-400", children: "$" }), _jsx("input", { id: "lf-price", type: "number", min: "0", step: "0.01", value: price, onChange: (e) => setPrice(e.target.value), placeholder: "0.00", className: `${inputCls} pl-8` })] }))] }), _jsxs("div", { children: [_jsxs("label", { className: "mb-2 block text-sm font-bold text-charcoal-900", children: ["Photos (", images.length, "/", MAX_IMAGES, ")"] }), _jsx(ImageUploader, { images: images, onChange: setImages })] }), error && _jsx("p", { className: "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700", children: error }), _jsxs("div", { className: "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", children: [_jsx("button", { type: "button", onClick: () => router.back(), className: "rounded-full border border-charcoal-200 px-5 py-3 text-sm font-bold text-charcoal-700 transition hover:bg-charcoal-50", children: "Cancel" }), _jsxs("button", { type: "submit", disabled: loading, className: "inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60", children: [loading && _jsx("span", { className: "h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin-slow" }), mode === 'create' ? 'Publish Listing' : 'Save Changes'] })] })] }));
}
