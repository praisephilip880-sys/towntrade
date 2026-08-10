export const CATEGORIES = ['items', 'gigs', 'free'];
export const CATEGORY_LABELS = {
    items: 'Items for Sale',
    gigs: 'Gigs & Services',
    free: 'Free Stuff',
};
export const CATEGORY_EMOJIS = {
    items: '🛍️',
    gigs: '🛠️',
    free: '🎁',
};
export const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'lowest', label: 'Lowest Price' },
    { value: 'highest', label: 'Highest Price' },
];
export function isCategory(value) {
    return typeof value === 'string' && (value === 'items' || value === 'gigs' || value === 'free');
}
export function isSortKey(value) {
    return typeof value === 'string' && (value === 'newest' || value === 'lowest' || value === 'highest');
}
