import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ToastProvider } from '@/components/Toaster';
import { AuthProvider } from '@/components/AuthProvider';
import SafetyWidget from '@/components/SafetyWidget';
import './globals.css';
// This app is fully session-driven: every page needs live server data, so
// nothing may be statically prerendered (prerendering would run DB queries at
// build time and fail). This also lets it build on any platform (Vercel/Render).
export const dynamic = 'force-dynamic';
export const metadata = {
    title: 'TownTrade — Trade, Earn, and Connect Right in Your Neighborhood',
    description: 'TownTrade is a secure local community marketplace. List items and services, chat securely, and trade safely with verified neighbors.',
};
export default function RootLayout({ children }) {
    return (_jsxs("html", { lang: "en", children: [_jsxs("head", { children: [_jsx("link", { rel: "preconnect", href: "https://fonts.googleapis.com" }), _jsx("link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" }), _jsx("link", { href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap", rel: "stylesheet" })] }), _jsx("body", { className: "min-h-screen bg-white font-sans text-charcoal-900", children: _jsxs(ToastProvider, { children: [_jsx(AuthProvider, { children: children }), _jsx(SafetyWidget, {})] }) })] }));
}
