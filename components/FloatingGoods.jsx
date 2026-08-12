'use client';

/**
 * Playful "3D" floating goods background: products people trade on TownTrade
 * (money, bikes, clothes, phones, headphones…) gently floating with CSS 3D
 * transforms. Pure CSS — lightweight, no WebGL needed, stays on the palette.
 */
const GOODS = [
  { emoji: '💰', label: 'Cash', cls: 'left-[6%] top-[16%] text-4xl [animation-delay:0s]' },
  { emoji: '🚲', label: 'Bicycle', cls: 'left-[16%] top-[52%] text-5xl [animation-delay:1.4s]' },
  { emoji: '👕', label: 'Clothes', cls: 'left-[46%] top-[8%] text-4xl [animation-delay:0.7s]' },
  { emoji: '📱', label: 'Phones', cls: 'left-[58%] top-[46%] text-5xl [animation-delay:2.1s]' },
  { emoji: '🎧', label: 'Headphones', cls: 'left-[78%] top-[14%] text-4xl [animation-delay:1s]' },
  { emoji: '🛋️', label: 'Furniture', cls: 'left-[86%] top-[58%] text-5xl [animation-delay:1.8s]' },
  { emoji: '🎮', label: 'Gaming', cls: 'left-[36%] top-[68%] text-4xl [animation-delay:2.6s]' },
  { emoji: '📷', label: 'Cameras', cls: 'left-[2%] top-[78%] text-4xl [animation-delay:0.4s]' },
];

export default function FloatingGoods() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [perspective:900px]" aria-hidden="true">
      {/* soft depth blobs */}
      <span className="absolute left-[12%] top-[20%] h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl" />
      <span className="absolute bottom-[10%] right-[8%] h-52 w-52 rounded-full bg-emerald-100/50 blur-3xl" />

      {GOODS.map((g) => (
        <span key={g.emoji} className={`absolute ${g.cls} hidden select-none sm:block`}>
          <span className="block animate-float-3d drop-shadow-[0_10px_12px_rgba(4,120,87,0.18)] will-change-transform">
            {g.emoji}
          </span>
        </span>
      ))}
    </div>
  );
}
