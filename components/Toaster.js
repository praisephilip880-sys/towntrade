'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useRef, useState } from 'react';
const ToastContext = createContext({ toast: () => { } });
export const useToast = () => useContext(ToastContext);
const STYLES = {
    success: {
        ring: 'border-emerald-200',
        iconBg: 'bg-emerald-600',
        icon: (_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round", className: "h-3.5 w-3.5", children: _jsx("path", { d: "M20 6 9 17l-5-5" }) })),
    },
    error: {
        ring: 'border-red-200',
        iconBg: 'bg-red-600',
        icon: (_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", className: "h-3.5 w-3.5", children: _jsx("path", { d: "M6 6l12 12M18 6 6 18" }) })),
    },
    info: {
        ring: 'border-charcoal-200',
        iconBg: 'bg-charcoal-800',
        icon: (_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", className: "h-3.5 w-3.5", children: _jsx("path", { d: "M12 11v5M12 8h.01" }) })),
    },
    warning: {
        ring: 'border-amber-200',
        iconBg: 'bg-amber-500',
        icon: (_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", className: "h-3.5 w-3.5", children: _jsx("path", { d: "M12 3 2.5 20h19L12 3Zm0 7v4m0 3h.01" }) })),
    },
};
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);
    const toast = useCallback((message, type = 'success') => {
        const id = ++idRef.current;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4500);
    }, []);
    return (_jsxs(ToastContext.Provider, { value: { toast }, children: [children, _jsx("div", { className: "pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2", children: toasts.map((t) => {
                    const s = STYLES[t.type];
                    return (_jsxs("div", { className: `pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-lift animate-toast-in ${s.ring}`, role: "status", children: [_jsx("span", { className: `mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${s.iconBg}`, children: s.icon }), _jsx("p", { className: "text-sm font-medium leading-snug text-charcoal-800", children: t.message })] }, t.id));
                }) })] }));
}
