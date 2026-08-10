import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IconStar } from './icons';
const SIZES = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
};
export function StarRow({ size, className = '' }) {
    return (_jsx("span", { className: `inline-flex items-center gap-0.5 ${className}`, children: [0, 1, 2, 3, 4].map((i) => (_jsx(IconStar, { className: SIZES[size] }, i))) }));
}
/** Display a 1–5 emerald star rating with a partial-fill for averages. */
export default function StarRating({ value, count = 0, size = 'md', showValue = false }) {
    const fill = value == null ? 0 : Math.max(0, Math.min(5, value)) / 5;
    return (_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsxs("span", { className: "relative inline-flex", "aria-label": value == null ? 'No ratings yet' : `Rated ${value.toFixed(1)} out of 5`, children: [_jsx(StarRow, { size: size, className: "text-charcoal-200" }), _jsx("span", { className: "absolute inset-0 overflow-hidden", style: { width: `${fill * 100}%` }, children: _jsx(StarRow, { size: size, className: "text-emerald-500" }) })] }), showValue && value != null && (_jsxs("span", { className: "text-sm font-semibold text-charcoal-800", children: [value.toFixed(1), count > 0 && _jsxs("span", { className: "font-normal text-charcoal-400", children: [" (", count, ")"] })] })), showValue && value == null && _jsx("span", { className: "text-sm text-charcoal-400", children: "No reviews yet" })] }));
}
