import { isCurrency, rateToUsd } from './currencies';

/**
 * Format a price stored in USD cents as a localized currency string, converting
 * into the target currency for display. "Free" for zero/negative values.
 * Pass `currency` (ISO code, e.g. 'NGN') or default to USD.
 */
export function formatPrice(cents, currency = 'USD') {
    if (cents <= 0)
        return 'Free';
    const code = isCurrency(currency) ? currency : 'USD';
    const amount = (cents / 100) * rateToUsd(code);
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: code,
            minimumFractionDigits: 0,
            maximumFractionDigits: cents % 100 === 0 && code === 'USD' ? 0 : 2,
        }).format(amount);
    }
    catch {
        return `${code} ${amount.toFixed(2)}`;
    }
}
/** "Aug 10, 2026" */
export function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime()))
        return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
/** "Just now", "12m ago", "3h ago", "2d ago", else a short date. */
export function timeAgo(iso) {
    const then = new Date(iso).getTime();
    if (isNaN(then))
        return '';
    const seconds = Math.floor((Date.now() - then) / 1000);
    if (seconds < 45)
        return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7)
        return `${days}d ago`;
    return formatDate(iso);
}
/** "Mia Chen" -> "MC" */
export function initials(name) {
    return name
        .split(' ')
        .map((part) => part.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}
/** 12:34 PM style clock time for chat bubbles. */
export function formatTime(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime()))
        return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
