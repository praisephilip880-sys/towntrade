'use client';

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
  // Real-device location: coordinates + reverse-geocoded neighborhood name.
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
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
    } catch {
      setChallenge(null);
    } finally {
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
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  // Ask the browser for the user's real location and reverse-geocode it into a
  // neighborhood name (free BigDataCloud endpoint, no API key, CORS-enabled).
  const locateMe = async () => {
    if (locating) return;
    setLocating(true);
    setError('');
    try {
      const position = await new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          reject(new Error('Geolocation is not supported in this browser.'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 });
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setCoords({ lat, lng });
      setVerifyLocation(true);
      const geo = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const place = await geo.json();
      const name = place?.city || place?.locality || place?.principalSubdivision || place?.countryName || '';
      if (name && neighborhood.trim().length < 2) setNeighborhood(name);
    } catch (err) {
      setError(
        err instanceof Error && err.code === 1
          ? 'Location permission denied. You can still type your neighborhood name manually.'
          : 'Could not get your location. Please type your neighborhood name instead.'
      );
    } finally {
      setLocating(false);
    }
  };

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
      if (fullName.trim().length < 2) return setError('Please enter your full name.');
      if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email address.');
      if (password.length < 6) return setError('Password must be at least 6 characters.');
      if (neighborhood.trim().length < 2) return setError('Please enter your neighborhood name.');
    } else if (!email.trim() || !password) {
      return setError('Please enter your email and password.');
    }
    if (!challenge) {
      await fetchChallenge();
      return setError('The Safety Bot needs a moment to prepare your security question. Please try again.');
    }
    if (!challengeAnswer.trim()) return setError('Answer the Safety Bot question to continue.');
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'register'
            ? {
                fullName,
                email,
                password,
                neighborhood,
                locationVerified: verifyLocation,
                lat: coords?.lat ?? null,
                lng: coords?.lng ?? null,
                challengeId: challenge.id,
                answer: challengeAnswer.trim(),
              }
            : { email, password, challengeId: challenge.id, answer: challengeAnswer.trim() }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        if (data.error && data.error.toLowerCase().includes('safety bot')) fetchChallenge();
        return;
      }
      toast(mode === 'register' ? 'Welcome to TownTrade! 🎉' : `Welcome back, ${data.user?.fullName?.split(' ')[0] ?? 'neighbor'}!`);
      onClose();
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-charcoal-200 bg-white px-4 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-300 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-charcoal-950/50 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-lift animate-pop-in sm:p-8">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-charcoal-400 transition hover:bg-charcoal-50 hover:text-charcoal-700"
        >
          <IconX className="h-4 w-4" />
        </button>

        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-base font-extrabold text-white shadow-emerald">TT</span>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-charcoal-950">TownTrade</p>
            <p className="text-xs text-charcoal-400">Trade, earn & connect locally</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-charcoal-50 p-1">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError('');
              }}
              className={`rounded-full py-2 text-sm font-semibold transition ${
                mode === m ? 'bg-white text-charcoal-950 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {mode === 'login' && (
          <div className="mb-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-400">Quick demo access</p>
            {DEMO_ACCOUNTS.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => fillDemo(d.email)}
                className="flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="flex items-center gap-2">
                  <IconSparkles className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-charcoal-900">{d.label}</span>
                </span>
                <span className="text-xs text-charcoal-400">{d.note}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label htmlFor="am-fullname" className="mb-1.5 block text-sm font-semibold text-charcoal-800">Full Name</label>
                <input id="am-fullname" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Alex Morgan" className={inputCls} autoComplete="name" />
              </div>

              <div>
                <label htmlFor="am-neighborhood" className="mb-1.5 block text-sm font-semibold text-charcoal-800">Neighborhood Name</label>
                <div className="relative">
                  <IconMapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300" />
                  <input id="am-neighborhood" type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="e.g. Riverside" className={`${inputCls} pl-10`} autoComplete="address-level2" />
                </div>
                {coords && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    📍 Real location captured ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}) — you will be a Verified Neighbor
                  </p>
                )}
                <button
                  type="button"
                  onClick={locateMe}
                  disabled={locating}
                  className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${
                    coords
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-charcoal-200 bg-white text-charcoal-700 hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  {locating ? (
                    <span className="h-3 w-3 rounded-full border-2 border-emerald-300 border-t-emerald-600 animate-spin-slow" />
                  ) : (
                    <span>📍</span>
                  )}
                  {locating ? 'Finding your location…' : coords ? '✓ Location captured — use my real location' : 'Use my current location (device GPS)'}
                </button>
              </div>
            </>
          )}

          <div>
            <label htmlFor="am-email" className="mb-1.5 block text-sm font-semibold text-charcoal-800">Email</label>
            <input id="am-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} autoComplete="email" />
          </div>

          <div>
            <label htmlFor="am-password" className="mb-1.5 block text-sm font-semibold text-charcoal-800">Password</label>
            <div className="relative">
              <IconEye className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300" />
              <input id="am-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'} className={`${inputCls} pr-10`} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
            </div>
          </div>

          {mode === 'register' && (
            <button
              type="button"
              onClick={() => setVerifyLocation((v) => !v)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                verifyLocation ? 'border-emerald-300 bg-emerald-50' : 'border-charcoal-200 bg-white hover:border-charcoal-300'
              }`}
            >
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${verifyLocation ? 'border-emerald-600 bg-emerald-600' : 'border-charcoal-300 bg-white'}`}>
                {verifyLocation && <IconCheck className="h-3.5 w-3.5 text-white" />}
              </span>
              <span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-charcoal-900">
                  Verify Location
                  {verifyLocation && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      <IconShield className="h-3 w-3" /> Verified Neighbor
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-charcoal-400">
                  Simulated neighborhood verification — grants you the emerald <span className="font-semibold text-emerald-700">Verified Neighbor</span> badge on your profile.
                </span>
              </span>
            </button>
          )}

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
            <div className="flex items-center gap-2">
              <IconShield className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-xs font-bold text-emerald-800">Safety Bot check</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-emerald-700/80">Prove you’re human before entering the marketplace.</p>
            {challengeBusy ? (
              <div className="mt-2.5 h-11 animate-pulse rounded-xl bg-emerald-100/70" />
            ) : challenge ? (
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-sm font-bold text-charcoal-900">{challenge.question}</div>
                <input
                  type="number"
                  inputMode="numeric"
                  value={challengeAnswer}
                  onChange={(e) => setChallengeAnswer(e.target.value)}
                  placeholder="Answer"
                  aria-label="Answer the safety question"
                  className="w-24 rounded-xl border border-charcoal-200 bg-white px-3 py-2 text-sm font-bold text-charcoal-900 placeholder:font-medium placeholder:text-charcoal-300 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button type="button" onClick={fetchChallenge} className="shrink-0 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50">
                  New question
                </button>
              </div>
            ) : (
              <button type="button" onClick={fetchChallenge} className="mt-2.5 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50">
                Load security question
              </button>
            )}
          </div>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading || challengeBusy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-emerald transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin-slow" />}
            {mode === 'login' ? 'Sign In Securely' : 'Create My Account'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-charcoal-400">
          {mode === 'login' ? (
            <>
              New to TownTrade?{' '}
              <button type="button" onClick={() => setMode('register')} className="font-semibold text-emerald-600 hover:text-emerald-500">
                Create an account
              </button>
            </>
          ) : (
            <>
              Already a neighbor?{' '}
              <button type="button" onClick={() => setMode('login')} className="font-semibold text-emerald-600 hover:text-emerald-500">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
