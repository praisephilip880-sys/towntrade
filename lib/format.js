/** Format a price in cents as a USD string, or "Free" for zero/negative values. */
export function formatPrice(cents) {
    if (cents <= 0)
        return 'Free';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
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
