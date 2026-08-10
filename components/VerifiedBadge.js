import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IconShield } from './icons';
/** Emerald "Verified Neighbor" badge shown next to verified sellers. */
export default function VerifiedBadge({ size = 'sm' }) {
    return (_jsxs("span", { className: `inline-flex items-center gap-1 rounded-full bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`, children: [_jsx(IconShield, { className: size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5' }), "Verified Neighbor"] }));
}
