'use client';

/** TownTrade brand logo: an emerald shield with "TT" inside. */
export default function Logo({ size = 'md', withWordmark = true, className = '' }) {
  const box = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  const text = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-sm' : 'text-[11px]';
  const word = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`relative inline-flex ${box} items-center justify-center`}>
        <svg viewBox="0 0 48 56" className="h-full w-full drop-shadow-sm" aria-hidden="true">
          <defs>
            <linearGradient id="tt-shield" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          <path
            d="M24 2 44 10v16c0 13.5-8.6 23.4-20 28C12.6 49.4 4 39.5 4 26V10L24 2Z"
            fill="url(#tt-shield)"
            stroke="#047857"
            strokeWidth="1.5"
          />
          <path
            d="M24 7 38 12.6V26c0 10-6.3 17.6-14 21.4C16.3 43.6 10 36 10 26V12.6L24 7Z"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.35"
            strokeWidth="1"
          />
        </svg>
        <span className={`absolute font-black tracking-tighter text-white ${text}`}>TT</span>
      </span>
      {withWordmark && (
        <span className={`font-extrabold tracking-tight text-charcoal-950 ${word}`}>TownTrade</span>
      )}
    </span>
  );
}
