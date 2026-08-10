'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toaster';
import { IconCheck, IconEye, IconMapPin, IconShield, IconSparkles, IconX } from './icons';
const DEMO_ACCOUNTS = [
    { label: 'Demo Buyer', email: 'buyer@towntrade.local', note: 'escrow purchase + chat ready' },
    { label: 'Demo Seller', email: 'mia@towntrade.local', note: 'listings + reviews ready' },
];
export default function AuthModal({ open, initialMode = 'login', redirectTo = '/marketplace', onClose }) {
    const router = useRouter();
    const { toast } = useToast();
    const [mode, setMode] = useState(initialMode);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [verifyLocation, setVerifyLocation] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // Safety Bot human check: a fresh addition challenge on every sign-in.
    const [challenge, setChallenge] = useState(null);
    const [challengeAnswer, setChallengeAnswer] = useState('');
    const [challengeBusy, setChallengeBusy] = useState(false);
    const fetchChallenge = async () => {
        setChallengeBusy(true);
        setChallengeAnswer('');
        try {
            const res = await fetch('/api/auth/challenge', { cache: 'no-store' });
            const data = await res.json();
            if (res.ok && data.challenge) setChallenge(data.challenge);
        }
        catch {
            setChallenge(null);
        }
        finally {
            setChallengeBusy(false);
        }
    };
    useEffect(() => {
        if (open) {
            setMode(initialMode);
            setError('');
            fetchChallenge();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialMode]);
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);
    if (!open)
        return null;
    const fillDemo = (demoEmail) => {
        setMode('login');
        setEmail(demoEmail);
        setPassword('password123');
        setError('');
        fetchChallenge();
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (mode === 'register') {
            if (fullName.trim().length < 2)
                return setError('Please enter your full name.');
            if (!/^\S+@\S+\.\S+$/.test(email))
                return setError('Please enter a valid email address.');
            if (password.length < 6)
                return setError('Password must be at least 6 characters.');
            if (neighborhood.trim().length < 2)
                return setError('Please enter your neighborhood name.');
        }
        else {
            if (!email.trim() || !password)
                return setError('Please enter your email and password.');
        }
        if (!challenge) {
            await fetchChallenge();
            return setError('The Safety Bot needs a moment to prepare your security question. Please try again.');
        }
        if (!challengeAnswer.trim()) {
            return setError('Answer the Safety Bot question to continue.');
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/auth/${mode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mode === 'register'
                    ? { fullName, email, password, neighborhood, locationVerified: verifyLocation, challengeId: challenge.id, answer: challengeAnswer.trim() }
                    : { email, password, challengeId: challenge.id, answer: challengeAnswer.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Something went wrong. Please try again.');
                // Wrong challenge answer (or expired) — issue a fresh question.
                if (data.error && data.error.toLowerCase().includes('safety bot')) {
                    fetchChallenge();
                }
                return;
            }
            toast(mode === 'register' ? 'Welcome to TownTrade! 🎉' : `Welcome back, ${data.user?.fullName?.split(' ')[0] ?? 'neighbor'}!`);
            onClose();
            router.push(redirectTo);
            router.refresh();
        }
        catch {
            setError('Network error. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    const inputCls = 'w-full rounded-xl border border-charcoal-200 bg-white px-4 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-300 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';
    return (_jsx("div", { className: "fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-charcoal-950/50 p-4 backdrop-blur-sm animate-fade-in", onMouseDown: (e) => e.target === e.currentTarget && onClose(), children: _jsxs("div", { className: "relative w-full max-w-md rounded-3xl bg-white p-6 shadow-lift animate-pop-in sm:p-8", children: [_jsx("button", { onClick: onClose, "aria-label": "Close", className: "absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-charcoal-400 transition hover:bg-charcoal-50 hover:text-charcoal-700", children: _jsx(IconX, { className: "h-4 w-4" }) }), _jsxs("div", { className: "mb-5 flex items-center gap-2.5", children: [_jsx("span", { className: "flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-base font-extrabold text-white shadow-emerald", children: "T" }), _jsxs("div", { children: [_jsx("p", { className: "text-lg font-extrabold tracking-tight text-charcoal-950", children: "TownTrade" }), _jsx("p", { className: "text-xs text-charcoal-400", children: "Trade, earn & connect locally" })] })] }), _jsx("div", { className: "mb-6 grid grid-cols-2 gap-1 rounded-full bg-charcoal-50 p-1", children: ['login', 'register'].map((m) => (_jsx("button", { type: "button", onClick: () => {
                            setMode(m);
                            setError('');
                        }, className: `rounded-full py-2 text-sm font-semibold transition ${mode === m ? 'bg-white text-charcoal-950 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-800'}`, children: m === 'login' ? 'Sign In' : 'Create Account' }, m))) }), mode === 'login' && (_jsxs("div", { className: "mb-5 space-y-2", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-charcoal-400", children: "Quick demo access" }), DEMO_ACCOUNTS.map((d) => (_jsxs("button", { type: "button", onClick: () => fillDemo(d.email), className: "flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(IconSparkles, { className: "h-4 w-4 text-emerald-600" }), _jsx("span", { className: "text-sm font-semibold text-charcoal-900", children: d.label })] }), _jsx("span", { className: "text-xs text-charcoal-400", children: d.note })] }, d.email)))] })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [mode === 'register' && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "am-fullname", className: "mb-1.5 block text-sm font-semibold text-charcoal-800", children: "Full Name" }), _jsx("input", { id: "am-fullname", type: "text", value: fullName, onChange: (e) => setFullName(e.target.value), placeholder: "e.g. Alex Morgan", className: inputCls, autoComplete: "name" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "am-neighborhood", className: "mb-1.5 block text-sm font-semibold text-charcoal-800", children: "Neighborhood Name" }), _jsxs("div", { className: "relative", children: [_jsx(IconMapPin, { className: "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300" }), _jsx("input", { id: "am-neighborhood", type: "text", value: neighborhood, onChange: (e) => setNeighborhood(e.target.value), placeholder: "e.g. Riverside", className: `${inputCls} pl-10`, autoComplete: "address-level2" })] })] })] })), _jsxs("div", { children: [_jsx("label", { htmlFor: "am-email", className: "mb-1.5 block text-sm font-semibold text-charcoal-800", children: "Email" }), _jsx("input", { id: "am-email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", className: inputCls, autoComplete: "email" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "am-password", className: "mb-1.5 block text-sm font-semibold text-charcoal-800", children: "Password" }), _jsxs("div", { className: "relative", children: [_jsx(IconEye, { className: "pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300" }), _jsx("input", { id: "am-password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: mode === 'register' ? 'At least 6 characters' : 'Your password', className: `${inputCls} pr-10`, autoComplete: mode === 'register' ? 'new-password' : 'current-password' })] })] }), mode === 'register' && (_jsxs("button", { type: "button", onClick: () => setVerifyLocation((v) => !v), className: `flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${verifyLocation ? 'border-emerald-300 bg-emerald-50' : 'border-charcoal-200 bg-white hover:border-charcoal-300'}`, children: [_jsx("span", { className: `mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${verifyLocation ? 'border-emerald-600 bg-emerald-600' : 'border-charcoal-300 bg-white'}`, children: verifyLocation && _jsx(IconCheck, { className: "h-3.5 w-3.5 text-white" }) }), _jsxs("span", { children: [_jsxs("span", { className: "flex items-center gap-1.5 text-sm font-semibold text-charcoal-900", children: ["Verify Location", verifyLocation && (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white", children: [_jsx(IconShield, { className: "h-3 w-3" }), " Verified Neighbor"] }))] }), _jsxs("span", { className: "mt-0.5 block text-xs leading-relaxed text-charcoal-400", children: ["Simulated neighborhood verification \u2014 grants you the emerald ", _jsx("span", { className: "font-semibold text-emerald-700", children: "Verified Neighbor" }), " badge on your profile."] })]                  })] })), _jsxs("div", { className: "rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(IconShield, { className: "h-4 w-4 shrink-0 text-emerald-600" }), _jsx("p", { className: "text-xs font-bold text-emerald-800", children: "Safety Bot check" })] }), _jsx("p", { className: "mt-1 text-xs leading-relaxed text-emerald-700/80", children: "Prove you\u2019re human before entering the marketplace." }), challengeBusy ? (_jsx("div", { className: "mt-2.5 h-11 animate-pulse rounded-xl bg-emerald-100/70" })) : challenge ? (_jsxs("div", { className: "mt-2.5 flex items-center gap-2", children: [_jsxs("div", { className: "flex-1 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-sm font-bold text-charcoal-900", children: [challenge.question] }), _jsx("input", { type: "number", inputMode: "numeric", value: challengeAnswer, onChange: (e) => setChallengeAnswer(e.target.value), placeholder: "Answer", "aria-label": "Answer the safety question", className: "w-24 rounded-xl border border-charcoal-200 bg-white px-3 py-2 text-sm font-bold text-charcoal-900 placeholder:font-medium placeholder:text-charcoal-300 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" }), _jsxs("button", { type: "button", onClick: fetchChallenge, className: "shrink-0 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50", children: ["New question"] })] })) : (_jsx("button", { type: "button", onClick: fetchChallenge, className: "mt-2.5 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50", children: "Load security question" }))] }), error && (_jsx("p", { className: "rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700", children: error })), _jsxs("button", { type: "submit", disabled: loading || challengeBusy, className: "flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60", children: [loading && _jsx("span", { className: "h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin-slow" }), mode === 'login' ? 'Sign In Securely' : 'Create My Account'] })] }), _jsx("p", { className: "mt-5 text-center text-xs text-charcoal-400", children: mode === 'login' ? (_jsxs(_Fragment, { children: ["New to TownTrade?", ' ', _jsx("button", { type: "button", onClick: () => setMode('register'), className: "font-semibold text-emerald-600 hover:text-emerald-500", children: "Create an account" })] })) : (_jsxs(_Fragment, { children: ["Already a neighbor?", ' ', _jsx("button", { type: "button", onClick: () => setMode('login'), className: "font-semibold text-emerald-600 hover:text-emerald-500", children: "Sign in" })] })) })] }) }));
}
