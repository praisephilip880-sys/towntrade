import { fetchRecentReviews } from '@/lib/community';

function Stars({ rating }) {
    return (
        <div className="flex gap-0.5 text-emerald-500" aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= Math.round(rating) ? 'text-emerald-500' : 'text-charcoal-200'}>
                    ★
                </span>
            ))}
        </div>
    );
}

const initialsOf = (name) =>
    String(name || '?')
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

export default function Testimonials() {
    // Real reviews left by neighbors after completed trades — never fabricated.
    const reviews = fetchRecentReviews(3);

    return (
        <section id="reviews" className="scroll-mt-20 border-t border-charcoal-100 bg-charcoal-50/40 py-20 lg:py-24">
            <div className="container-page">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Neighbor reviews</span>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-charcoal-950 sm:text-4xl">
                        Real reviews from real trades
                    </h2>
                    <p className="mt-4 text-lg leading-relaxed text-charcoal-500">
                        Every review below was left by a verified neighbor after a completed TownTrade transaction.
                    </p>
                </div>

                <div className="mt-12 grid gap-6 md:grid-cols-3">
                    {reviews.length === 0 ? (
                        <div className="rounded-3xl border border-charcoal-100 bg-white p-10 text-center shadow-soft md:col-span-3">
                            <p className="text-4xl">💬</p>
                            <p className="mt-3 font-extrabold text-charcoal-950">No reviews yet</p>
                            <p className="mt-1 text-sm text-charcoal-500">
                                Be the first to complete a trade and leave a review for your neighbor!
                            </p>
                        </div>
                    ) : (
                        reviews.map((r) => (
                            <figure
                                key={r.createdAt + r.reviewerName}
                                className="flex flex-col rounded-3xl border border-charcoal-100 bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lift"
                            >
                                <Stars rating={r.rating} />
                                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-charcoal-700">
                                    “{r.comment}”
                                </blockquote>
                                <figcaption className="mt-5 flex items-center gap-3 border-t border-charcoal-100 pt-4">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white">
                                        {initialsOf(r.reviewerName)}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-extrabold text-charcoal-950">{r.reviewerName}</span>
                                        <span className="block text-xs text-charcoal-400">📍 {r.neighborhood}</span>
                                    </span>
                                </figcaption>
                            </figure>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
