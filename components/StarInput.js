'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { IconStar } from './icons';
export default function StarInput({ value, onChange }) {
    const [hover, setHover] = useState(0);
    const active = hover || value;
    return (_jsxs("div", { className: "flex items-center gap-1", children: [[1, 2, 3, 4, 5].map((n) => (_jsx("button", { type: "button", "aria-label": `${n} star${n > 1 ? 's' : ''}`, onMouseEnter: () => setHover(n), onMouseLeave: () => setHover(0), onClick: () => onChange(n), className: "p-0.5 transition-transform hover:scale-125 active:scale-95", children: _jsx(IconStar, { className: `h-7 w-7 transition-colors ${n <= active ? 'text-emerald-500' : 'text-charcoal-200'}` }) }, n))), _jsxs("span", { className: "ml-2 text-sm font-semibold text-charcoal-700", children: [active || '', active ? '/5' : ''] })] }));
}
