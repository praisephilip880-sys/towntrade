/**
 * TownTrade AI Assistant — local reply engine.
 *
 * Pure JavaScript, importable from server + client. Uses keyword/intent
 * matching with a rich knowledge base about the marketplace. When a question
 * is not understood, the assistant escalates to the owner's WhatsApp DM so a
 * human takes over. The API route additionally supports a real LLM provider
 * (AI_API_KEY, OpenAI-compatible) when configured.
 */
import { whatsappLink } from './constants';

export const ASSISTANT_NAME = 'TownTrade AI Assistant';

export const CHATBOT_WELCOME =
  "Hi! I'm the TownTrade AI Assistant. 🤖 I can help you buy, sell, pay via OPay, understand escrow, delivery, refunds, and safety. Ask me anything — and if I can't help, I'll connect you directly with our support team on WhatsApp.";

/* ------------------------------- intents -------------------------------- */

const INTENTS = [
  {
    topic: 'greeting',
    keywords: ['hello', 'hi ', 'hey', 'good morning', 'good afternoon', 'good evening', 'how far', 'howdy'],
    answer: 'Hello neighbor! 👋 How can I help you today? You can ask about buying, selling, OPay payments, delivery, refunds, escrow, or safety.',
  },
  {
    topic: 'what is towntrade',
    keywords: ['what is towntrade', 'what is this', 'about the app', 'about this site', 'what does towntrade do', 'how does this work'],
    answer:
      'TownTrade is a secure local community marketplace. Neighbors list items and services, chat privately, and trade safely — payments are held in escrow until delivery is confirmed, and a Safety Bot watches every conversation for scams.',
  },
  {
    topic: 'how to sell',
    keywords: ['how do i sell', 'how to sell', 'post a listing', 'create a listing', 'list an item', 'sell something', 'how do i list'],
    answer:
      'To sell: tap "Post a Listing", add up to 5 photos, a title, description, price, and category, then publish. Buyers pay via card or OPay; the money sits in escrow until they confirm delivery, then you get 95% (we keep a flat 5% fee).',
  },
  {
    topic: 'how to buy',
    keywords: ['how do i buy', 'how to buy', 'buy something', 'make a purchase', 'buy now'],
    answer:
      'To buy: open a listing and hit "Buy Now". You can pay by card (Stripe) or with a local OPay transfer. Your money is held safely until the seller delivers — you confirm when you have the item, and only then is the seller paid.',
  },
  {
    topic: 'fees',
    keywords: ['fee', 'commission', 'charge', 'what do you take', 'how much do you charge', 'cost to sell', 'platform fee', 'percent'],
    answer:
      'TownTrade keeps one flat 5% platform fee on every completed sale. The seller receives 95%. There are no listing fees, no hidden charges, and no cost to browse or chat.',
  },
  {
    topic: 'escrow',
    keywords: ['escrow', 'hold', 'locked money', 'funds released', 'release funds', 'safe payment', 'protected'],
    answer:
      'Escrow means your payment is held safely by TownTrade until the deal is done. The buyer pays → funds are locked → the seller delivers → the buyer taps "Confirm Delivery / Release Funds" → the seller is paid. Nobody can be cheated.',
  },
  {
    topic: 'opay',
    keywords: ['opay', 'local payment', 'transfer', 'bank transfer', 'nair', 'account number', 'paypal', 'paystack', 'flutterwave', 'pay without card', 'no card', 'cash app'],
    answer:
      'You can pay with OPay if you prefer not to use a card! On the listing, tap Buy Now → "Pay with OPay". Transfer the Naira amount to the platform OPay account shown, then press "I have made the transfer". The seller is paid from that same account once you confirm delivery. 🏦',
  },
  {
    topic: 'delivery',
    keywords: ['delivery', 'shipping', 'pickup', 'pick up', 'where do we meet', 'how do i get it', 'arrange'],
    answer:
      'After you buy, use the "Message Seller" / "Chat with Seller" button to agree on delivery or pickup with the seller — meet-up spot, time, and any local delivery fee. Both of you stay protected because the money only releases after you confirm.',
  },
  {
    topic: 'refund',
    keywords: ['refund', 'return', 'money back', 'get my money', 'change my mind', 'did not deliver', 'never received'],
    answer:
      'If something goes wrong, open the purchase in your profile → "My Purchases" and tap "Request Refund". The Safety Bot will ask you a few quick questions, then your request goes straight to the admin for review. If approved, you get your money back.',
  },
  {
    topic: 'safety & scams',
    keywords: ['scam', 'fraud', 'safe', 'suspicious', 'fake', 'cheat', 'report', 'card details', 'cvv', 'otp', 'phishing'],
    answer:
      'The Safety Bot scans every chat for card numbers, bank details, phone numbers, and off-platform payment requests — anything sensitive is blocked and flagged. Never share your OTP, card, or account details in chat, and never pay outside TownTrade. Keep everything in-app!',
  },
  {
    topic: 'verification',
    keywords: ['verify', 'verified neighbor', 'location', 'badge', 'trust', 'green badge'],
    answer:
      'When you sign up, TownTrade uses your device location to set your neighborhood. Once verified you earn the green "Verified Neighbor" badge, which shows everyone you are a real local — buyers and sellers trust verified neighbors more.',
  },
  {
    topic: 'photos',
    keywords: ['photo', 'picture', 'image', 'upload', 'how many photos'],
    answer:
      'You can add up to 5 photos to a listing — the more real photos, the more trust buyers have. Photos are compressed automatically before uploading.',
  },
  {
    topic: 'account help',
    keywords: ['forgot password', 'reset password', 'change password', 'login problem', 'can not log in', 'cant log in', 'account locked'],
    answer:
      'For account or login help, the quickest way is to message us directly on WhatsApp — our support team replies fast. Tap the WhatsApp button below to start a chat.',
  },
  {
    topic: 'notifications',
    keywords: ['notification', 'alert', 'bell', 'notify'],
    answer:
      'TownTrade sends notifications for payments, payouts, refunds, and safety alerts. Tap the bell icon in the top bar to see them all, and allow browser notifications so you never miss a payment update.',
  },
  {
    topic: 'who runs towntrade',
    keywords: ['who is the admin', 'who runs this', 'who owns', 'support email', 'contact', 'customer support', 'help me', 'talk to a human', 'real person', 'whatsapp'],
    answer:
      'You can reach a real human anytime on WhatsApp — our support team is one tap away. 👇 (The button below opens a chat with the message you just asked.)',
  },
];

const DEFAULT_ANSWER =
  "I don't have a perfect answer for that one yet — but I never guess with your money! Our human support team on WhatsApp will take it from here. Tap the button below and I'll pre-fill your question for you. 👇";

/* ------------------------------ reply logic ----------------------------- */

/**
 * Match a keyword against the lowercased input. Short single words use word
 * boundaries so "hi" doesn't fire inside "which"; phrases use includes().
 */
function keywordHit(lower, keyword) {
  const k = String(keyword || '').trim().toLowerCase();
  if (!k) return false;
  if (k.includes(' ')) return lower.includes(k);
  return new RegExp(`\\b${k}\\b`).test(lower);
}

export function chatbotReply(text) {
  const lower = String(text || '').toLowerCase().trim();
  if (!lower) return { answer: DEFAULT_ANSWER, matched: null, escalate: true };

  for (const intent of INTENTS) {
    if (intent.keywords.some((k) => keywordHit(lower, k))) {
      // The support/contact intent should still offer the WhatsApp handoff.
      return { answer: intent.answer, matched: intent.topic, escalate: intent.topic === 'who runs towntrade' || intent.topic === 'account help' };
    }
  }
  return { answer: DEFAULT_ANSWER, matched: null, escalate: true };
}

/** The escalation CTA payload (WhatsApp deep link). */
export function escalation() {
  return { label: 'Chat with Support on WhatsApp', url: whatsappLink() };
}
