const PALETTES = {
    items: ['#065f46', '#10b981'],
    gigs: ['#134e4a', '#2dd4bf'],
    free: ['#1f2937', '#6b7280'],
};
/**
 * Generate a self-contained SVG placeholder image as a data URL so the demo
 * needs zero external image hosting. Stays strictly on the emerald/charcoal palette.
 */
export function svgDataUrl(label, emoji, category) {
    const [from, to] = PALETTES[category];
    const safeLabel = label.length > 32 ? `${label.slice(0, 30)}…` : label;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
</linearGradient></defs>
<rect width="800" height="600" fill="url(#g)"/>
<circle cx="660" cy="80" r="190" fill="rgba(255,255,255,0.12)"/>
<circle cx="110" cy="540" r="150" fill="rgba(255,255,255,0.08)"/>
<rect x="300" y="210" width="200" height="200" rx="36" fill="rgba(255,255,255,0.16)"/>
<text x="400" y="345" font-size="120" text-anchor="middle">${emoji}</text>
<text x="400" y="470" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700" fill="rgba(255,255,255,0.96)" text-anchor="middle">${safeLabel}</text>
</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
