import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ListingCardSkeleton } from '@/components/ListingCard';
export default function MarketplaceLoading() {
    return (_jsx("div", { className: "min-h-screen bg-charcoal-50/30", children: _jsxs("div", { className: "container-page py-8", children: [_jsxs("div", { className: "mb-6 space-y-3", children: [_jsx("div", { className: "h-9 w-72 animate-pulse rounded-xl bg-charcoal-100" }), _jsx("div", { className: "h-4 w-56 animate-pulse rounded-full bg-charcoal-100" })] }), _jsx("div", { className: "mb-7 flex gap-2", children: [...Array(4)].map((_, i) => (_jsx("div", { className: "h-10 w-32 animate-pulse rounded-full bg-charcoal-100" }, i))) }), _jsx("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", children: [...Array(8)].map((_, i) => (_jsx(ListingCardSkeleton, {}, i))) })] }) }));
}
