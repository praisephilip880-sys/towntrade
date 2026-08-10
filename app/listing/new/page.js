import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Navbar from '@/components/Navbar';
import ListingForm from '@/components/ListingForm';
import { requireUser } from '@/lib/auth';
export default function NewListingPage() {
    const user = requireUser();
    return (_jsxs("div", { className: "min-h-screen bg-charcoal-50/30", children: [_jsx(Navbar, { user: user }), _jsx("main", { className: "container-page py-8", children: _jsxs("div", { className: "mx-auto max-w-2xl", children: [_jsxs("div", { className: "mb-7", children: [_jsx("span", { className: "text-xs font-black uppercase tracking-[0.2em] text-emerald-600", children: "Post a listing" }), _jsx("h1", { className: "mt-2 text-2xl font-black tracking-tight text-charcoal-950 sm:text-3xl", children: "What are you offering?" }), _jsxs("p", { className: "mt-2 text-sm text-charcoal-500", children: ["Publish to verified neighbors in ", _jsx("span", { className: "font-bold text-charcoal-800", children: user.neighborhood }), " \u2014 it goes live instantly."] })] }), _jsx("div", { className: "rounded-3xl border border-charcoal-100 bg-white p-6 shadow-soft sm:p-8", children: _jsx(ListingForm, { mode: "create" }) })] }) })] }));
}
