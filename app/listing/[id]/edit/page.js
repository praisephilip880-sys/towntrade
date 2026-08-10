import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { notFound, redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ListingForm from '@/components/ListingForm';
import { requireUser } from '@/lib/auth';
import { fetchListingById } from '@/lib/listings';
export default async function EditListingPage({ params }) {
    const user = requireUser();
    const id = Number(params.id);
    const listing = Number.isInteger(id) ? fetchListingById(id) : null;
    if (!listing)
        notFound();
    if (listing.seller.id !== user.id && !user.isAdmin)
        redirect(`/listing/${listing.id}`);
    return (_jsxs("div", { className: "min-h-screen bg-charcoal-50/30", children: [_jsx(Navbar, { user: user }), _jsx("main", { className: "container-page py-8", children: _jsxs("div", { className: "mx-auto max-w-2xl", children: [_jsxs("div", { className: "mb-7", children: [_jsx("span", { className: "text-xs font-black uppercase tracking-[0.2em] text-emerald-600", children: "Edit listing" }), _jsxs("h1", { className: "mt-2 text-2xl font-black tracking-tight text-charcoal-950 sm:text-3xl", children: ["Update \u201C", listing.title, "\u201D"] }), _jsx("p", { className: "mt-2 text-sm text-charcoal-500", children: "Changes are published instantly to the marketplace." })] }), _jsx("div", { className: "rounded-3xl border border-charcoal-100 bg-white p-6 shadow-soft sm:p-8", children: _jsx(ListingForm, { mode: "edit", listingId: listing.id, initial: {
                                    title: listing.title,
                                    description: listing.description,
                                    price: listing.price,
                                    category: listing.category,
                                    images: listing.images,
                                } }) })] }) })] }));
}
