import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Navbar from '@/components/Navbar';
import ChatApp from '@/components/ChatApp';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
export default async function ChatPage({ searchParams }) {
    const user = requireUser();
    const rawChat = searchParams.chat;
    const rawListing = searchParams.listing;
    const rawSeller = searchParams.seller;
    const initialChatId = typeof rawChat === 'string' && /^\d+$/.test(rawChat) ? Number(rawChat) : null;
    const initialListingId = typeof rawListing === 'string' && /^\d+$/.test(rawListing) ? Number(rawListing) : null;
    const initialSellerId = typeof rawSeller === 'string' && /^\d+$/.test(rawSeller) ? Number(rawSeller) : null;
    const chats = db
        .prepare(`SELECT
         c.id, c.listing_id AS listingId, c.buyer_id AS buyerId, c.seller_id AS sellerId, c.updated_at AS updatedAt,
         l.title AS listingTitle, l.price AS listingPrice,
         (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS listingImage,
         u.id AS otherId, u.full_name AS otherName, u.neighborhood AS otherNeighborhood, u.location_verified AS otherVerified,
         (SELECT m.content FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastMessage,
         (SELECT m.created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastMessageAt
       FROM chats c
       JOIN listings l ON l.id = c.listing_id
       JOIN users u ON u.id = CASE WHEN c.buyer_id = ? THEN c.seller_id ELSE c.buyer_id END
       WHERE c.buyer_id = ? OR c.seller_id = ?
       ORDER BY c.updated_at DESC`)
        .all(user.id, user.id, user.id);
    const chatSummaries = chats.map((c) => ({
        id: c.id,
        listingId: c.listingId,
        listingTitle: c.listingTitle,
        listingPrice: c.listingPrice,
        listingImage: c.listingImage,
        otherId: c.otherId,
        otherName: c.otherName,
        otherNeighborhood: c.otherNeighborhood,
        otherVerified: c.otherVerified === 1,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
    }));
    return (_jsxs("div", { className: "min-h-screen bg-charcoal-50/30", children: [_jsx(Navbar, { user: user }), _jsx("main", { className: "container-page py-6 sm:py-8", children: _jsx(ChatApp, { currentUserId: user.id, initialChats: chatSummaries, initialChatId: initialChatId, initialListingId: initialListingId, initialSellerId: initialSellerId }) })] }));
}
