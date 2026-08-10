'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useToast } from './Toaster';
import StarInput from './StarInput';
import { IconX } from './icons';
export default function ReviewModal({ revieweeName, revieweeId, listingId, onClose, onDone }) {
    const { toast } = useToast();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);
    const submit = async (e) => {
        e.preventDefault();
        if (comment.trim().length > 500)
            return setError('Please keep your comment under 500 characters.');
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ revieweeId, listingId: listingId ?? null, rating, comment: comment.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Could not submit review.');
                return;
            }
            toast(`Thanks! Your ${rating}-star review for ${revieweeName} is live. ⭐`);
            onDone();
        }
        catch {
            setError('Network error. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-charcoal-950/50 p-4 backdrop-blur-sm animate-fade-in", onMouseDown: (e) => e.target === e.currentTarget && onClose(), children: _jsxs("div", { className: "relative w-full max-w-md rounded-3xl bg-white p-6 shadow-lift animate-pop-in sm:p-7", children: [_jsx("button", { onClick: onClose, "aria-label": "Close", className: "absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-charcoal-400 transition hover:bg-charcoal-50 hover:text-charcoal-700", children: _jsx(IconX, { className: "h-4 w-4" }) }), _jsx("h3", { className: "text-lg font-extrabold text-charcoal-950", children: "Rate your experience" }), _jsxs("p", { className: "mt-1 text-sm text-charcoal-500", children: ["How was your transaction with ", _jsx("span", { className: "font-bold text-charcoal-800", children: revieweeName }), "?"] }), _jsxs("form", { onSubmit: submit, className: "mt-5 space-y-4", children: [_jsxs("div", { className: "flex flex-col items-start gap-2 rounded-2xl border border-charcoal-100 bg-charcoal-50/50 p-4", children: [_jsx("span", { className: "text-xs font-bold uppercase tracking-wide text-charcoal-400", children: "Your rating" }), _jsx(StarInput, { value: rating, onChange: setRating })] }), _jsxs("div", { children: [_jsxs("label", { htmlFor: "rv-comment", className: "mb-1.5 block text-sm font-bold text-charcoal-900", children: ["Comment ", _jsx("span", { className: "font-normal text-charcoal-400", children: "(optional)" })] }), _jsx("textarea", { id: "rv-comment", rows: 4, value: comment, onChange: (e) => setComment(e.target.value), placeholder: "How did it go? Be kind and specific\u2026", className: "w-full resize-none rounded-xl border border-charcoal-200 bg-white px-4 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-300 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" }), _jsxs("p", { className: "mt-1 text-right text-xs text-charcoal-400", children: [comment.length, "/500"] })] }), error && _jsx("p", { className: "rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700", children: error }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", onClick: onClose, className: "flex-1 rounded-full border border-charcoal-200 px-5 py-2.5 text-sm font-bold text-charcoal-700 transition hover:bg-charcoal-50", children: "Cancel" }), _jsx("button", { type: "submit", disabled: loading, className: "flex-1 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-60", children: loading ? 'Submitting…' : 'Submit Review' })] })] })] }) }));
}
