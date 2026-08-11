import { fetchCommunityStats } from '@/lib/community';
import { IconBank, IconCard, IconShield, IconShieldAlert, IconUsers } from './icons';

const formatMoney = (cents) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((cents || 0) / 100);

const TRUST_CARDS = [
    {
        icon: <IconShield className="h-5 w-5" />,
        title: 'Escrow-protected payments',
        body: 'Your money never goes straight to a stranger. Funds sit safely in TownTrade escrow until you confirm the deal is done — then the seller is paid.',
    },
    {
        icon: <IconShieldAlert className="h-5 w-5" />,
        title: 'Safety Bot on every chat',
        body: 'The Safety Bot watches every conversation and flags scam patterns — account numbers, card details, and pressure tactics — and restricts bad actors fast.',
    },
    {
        icon: <IconUsers className="h-5 w-5" />,
        title: 'Verified neighbors only',
        body: 'Every member verifies their location before trading. You deal with people who live in your own neighborhood — not anonymous strangers.',
    },
    {
        icon: <IconCard className="h-5 w-5" />,
        title: 'Flat 5% — that is it',
        body: 'No listing fees, no hidden charges. Sellers keep 95% of every sale, paid straight to their bank. Simple, honest, transparent.',
    },
];

export default function TrustSection() {
    // Real number straight from the database: 5% of completed trades.
    const stats = fetchCommunityStats();

    return (
        <section id="trust" className="scroll-mt-20 bg-charcoal-950 py-20 lg:py-24">
            <div className="container-page">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Built for trust</span>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                        A marketplace where neighbors play fair
                    </h2>
                    <p className="mt-4 text-lg leading-relaxed text-charcoal-300">
                        One flat fee. Escrow on every trade. A Safety Bot watching every chat. That is how TownTrade keeps local trade honest.
                    </p>
                </div>

                <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {TRUST_CARDS.map((c) => (
                        <div
                            key={c.title}
                            className="group rounded-3xl border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:bg-white/10"
                        >
                            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-4 ring-emerald-500/10 transition group-hover:bg-emerald-500 group-hover:text-white">
                                {c.icon}
                            </span>
                            <h3 className="mt-4 text-base font-extrabold text-white">{c.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-charcoal-300">{c.body}</p>
                        </div>
                    ))}
                </div>

                {/* Flat-fee strip with the live revenue figure */}
                <div className="mt-8 overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 p-6 sm:p-8">
                    <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Sellers keep 95%</p>
                            <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                                One flat 5% platform fee. That is the whole business model.
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-charcoal-300">
                                Real fees already earned by the TownTrade community from completed trades:{' '}
                                <span className="font-extrabold text-emerald-400">{formatMoney(stats.revenue)}</span>
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4 rounded-2xl bg-white p-5 shadow-lift">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                                <IconBank className="h-6 w-6" />
                            </span>
                            <div className="text-left">
                                <p className="text-3xl font-black leading-none text-emerald-600">5%</p>
                                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-charcoal-500">platform fee only</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
