# TownTrade 🏘️

**Trade, Earn, and Connect Right in Your Neighborhood.**

TownTrade is a complete full-stack local community marketplace built with **Next.js (App Router) + SQLite + Tailwind CSS** — verified neighbors, private chats, **real Stripe Connect Express** escrow-protected payments, ratings, and bank payouts. Payments run against **Stripe test mode** out of the box; flip to live keys when you launch.

All data lives in a local SQLite database (`data/towntrade.db`) that is auto-created and seeded with realistic demo data on first run.

> 💡 **No native compilation needed.** The app uses Node's **built-in `node:sqlite`** module, so `npm install` is pure JavaScript — no Python, no Visual Studio build tools, no node-gyp.

---

## 🚀 Quick Start

Requirements: **Node.js 23.4+** (Node 24 recommended) and npm.

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

> **Windows note:** if npm is unavailable from your shell, run these commands in PowerShell or CMD.

### Demo accounts (password for all: `password123`)

| Account | Email | What to try |
|---|---|---|
| **Demo Buyer** | `buyer@towntrade.local` | Pending escrow purchase → **Confirm Delivery / Release Funds** · existing chat threads · leave a 5★ review |
| **Demo Seller (Mia)** | `mia@towntrade.local` | Active listings, reviews, connected bank · earn 95% payouts on sales |
| **Demo Seller (Jay)** | `jay@towntrade.local` | The seller on the buyer's pending escrow transaction |

The login modal has one-click **Demo Buyer** / **Demo Seller** fill buttons.

### Reset the demo data

```bash
npm run db:reset
```

Deletes the database; it is recreated and reseeded on the next start.

### Demo data auto-purge 🌱

Once the community grows past **50 registered users**, all demo accounts (`@towntrade.local`) and their listings — plus their chats, messages, transactions, and reviews — are **removed automatically**. This fires on startup and right after any new registration, so a growing marketplace naturally outgrows its seed data. The Safety Bot system account is always kept.

---

## 🧭 Feature Map

| # | Feature | Where to find it |
|---|---|---|
| 1 | Public landing page with hero + **Explore Marketplace** CTA + "How it Works" cards | `/` (opens auth modal) |
| 2 | Secure registration (Full Name, Email, Password, Neighborhood) + **Verify Location** checkbox | Auth modal → "Create Account" |
| 3 | **Verified Neighbor** badge | Profile header / seller cards (emerald shield) |
| 4 | Protected marketplace feed with **search**, **category filter** (Items for Sale / Gigs & Services / Free Stuff), and **sort** (Newest / Lowest / Highest) | `/marketplace` |
| 5 | **Post a Listing** with **drag-and-drop image upload** (auto-compressed client-side) | Navbar button → `/listing/new` |
| 6 | Listing detail with **Message Seller** + **Buy Now** | `/listing/[id]` |
| 7 | Listing **Edit** (emerald) / **Delete** (black) management | Profile → "My Listings" |
| 8 | **Split-screen private chat** (conversation list + thread, live polling) | `/chat` or "Message Seller" |
| 9 | **1–5 star rating + comment** after a completed transaction | My Purchases → "Rate Seller" or listing detail |
| 10 | **Payout Settings** — "Link Your Bank Account" opens **Stripe Connect Express onboarding** (Express account + accountLinks URL); green **Account Connected** badge once payouts are enabled | Profile → "Payout Settings" |
| 11 | **Stripe Checkout** — "Buy Now" opens Stripe's hosted Checkout (test card `4242 4242 4242 4242`). The payment is charged to TownTrade's Stripe balance and **held in escrow** | "Buy Now" on any listing |
| 12 | **Confirm Delivery / Release Funds** → a real **Stripe Transfer** moves 95% to the seller's connected bank; success toast: *"Transaction Complete! 5% platform fee saved, 95% sent to seller."* | Profile → "My Purchases" (pending item) |
| 13 | **Safety Bot (scam detection)** — scans every chat message for card numbers, bank/account details, phone numbers & off-platform payment requests; blocks the message, posts a bot warning, and **temporarily pauses the sender's selling access (24h)** | Try sending "my card is 4242 4242 4242 4242" in any chat |
| 14 | **Safety Assistant chatbot** — floating widget answering safety/escrow questions + shows your account status | Bottom-right shield button on any page |
| 15 | **Real community stats + Live Board** — the landing page numbers are computed from the actual database (listings, verified neighbors, completed trades, local-economy $), plus a live board showing **real sign-ins/sign-ups** and a **revenue-over-time chart** (5% platform fees per day) | Landing page "Live community board" · Admin → Overview |
| 16 | **Safety Bot human check** — sign-in and registration require solving a simple **addition question** (e.g. "What is 4 + 4?") issued by the Safety Bot. Answers are verified server-side, challenges are single-use and expire in 5 minutes — a placeholder that can be swapped for stronger security later | Auth modal → "Safety Bot check" |

### Suggested demo walkthrough

1. Sign in as **Demo Buyer**.
2. Go to **Profile → My Purchases** — you'll see the pending escrow item ("IKEA Desk + Chair").
3. Hit **Confirm Delivery / Release Funds** → watch the toast + the payout move to the seller.
4. Go to **Profile → Reviews / Payout Settings** — link your bank and verify your location.
5. Open **Chats** and reply inside the private thread with Mia.
6. Hit **Post a Listing**, upload photos, publish — then buy something with **Buy Now** to pay via Stripe Checkout (test card).

---

## 🗄️ Database Schema

Auto-created by `lib/db.js`. SQLite database with `foreign_keys` + WAL enabled.

```
users          id, full_name, email (unique), password_hash (scrypt), neighborhood,
               location_verified, bank_connected, stripe_account_id, is_admin, created_at
sessions       token (PK), user_id → users, created_at, expires_at
listings       id, user_id → users, title, description, price (cents), category
               (items|gigs|free), status (active|sold), created_at, updated_at
listing_images id, listing_id → listings (cascade), data_url, position
chats          id, listing_id → listings, buyer_id → users, seller_id → users,
               created_at, updated_at — unique (listing, buyer, seller)
messages       id, chat_id → chats (cascade), sender_id → users, content, created_at
transactions   id, listing_id → listings, buyer_id → users, seller_id → users,
               amount (cents), status (escrow_hold|completed), created_at, completed_at,
               stripe_checkout_session_id, stripe_payment_intent_id, stripe_transfer_id
reviews        id, listing_id → listings (set null), reviewer_id → users,
               reviewee_id → users, rating (1–5), comment, created_at
safety_events  id, user_id → users, chat_id → chats, category, snippet,
               action, created_at — every Safety Bot violation
login_events   id, user_id → users, event_type (signin|signup), created_at —
               every successful login/sign-up (drives the live community board)
```

Users also carry `safety_flags` (violation count), `selling_restricted_until`, `selling_restricted_reason` (temporary selling pause), and `is_admin` (platform moderator powers).

### Design notes

- **Prices** are stored as integer **cents** (`$85.00` → `8500`) to avoid float issues.
- **Passwords** are hashed with **scrypt + per-user salt** (Node built-ins only).
- **Sessions** are DB-backed random tokens in httpOnly cookies (7-day expiry).
- **Images** are stored as compressed JPEG **data URLs** (resized client-side, max ~1.5 MB) so the demo needs no storage service.
- **Escrow (Stripe Connect):** `Buy Now` creates a Stripe Checkout Session that charges the buyer on **TownTrade's Stripe balance** (the escrow). The 95% payout is **not** auto-transferred — a `transactions` row in `escrow_hold` is created once payment is confirmed (success page or webhook). Only the buyer's **release** action creates a real **Stripe Transfer** of 95% to the seller's connected Express account, completing the transaction (5% platform fee stays with TownTrade). Free listings complete instantly.

---

## 🏗️ Project Structure

```
app/
  page.js                   # Public landing page
  marketplace/page.js       # Protected feed (search / category / sort)
  listing/new|edit|[id]/    # Create, edit, detail pages
  chat/page.js              # Split-screen chat inbox
  profile/page.js           # Dashboard (listings, purchases, sales, reviews, payout)
  api/                      # auth · users · listings · chats · messages ·
                            # transactions · reviews · stripe (REST, JSON)
components/                 # Navbar, AuthModal, ListingCard, ImageUploader,
                            # CheckoutSuccessHandler, ChatApp, ProfileDashboard, Toaster…
lib/
  db.js                     # SQLite schema + demo seed (uses Node's built-in node:sqlite)
  auth.js / password.js     # Sessions & scrypt hashing
  listings.js / image.js / format.js / types.js
middleware.js               # Cookie guard for protected routes
```

## 🎨 Design System

- **White** surfaces (`#ffffff`, subtle `charcoal-50` tints)
- **Charcoal black** text & headers (`#101114` ramp), black secondary buttons
- **Emerald green** (`#10b981` / `#059669`) for primary actions, links, active nav, rating stars, success states & badges
- Inter typeface, soft shadows, micro-interactions (hover lifts, scale presses, toasts), fully responsive from mobile to desktop.

---

## 🛡️ Admin Dashboard

The account **`praisephilip880@gmail.com`** is the platform admin and gets an **Admin** link in the navbar + profile menu. The dashboard lives at **`/admin`** with four tabs:

- **Overview** — community stats: members, active/sold listings, escrow counts & value, completed volume, platform fees, restricted accounts.
- **Listings** — every listing from every account with **Edit** (opens the normal edit form) and **Delete** (removes the listing and its chats/transactions/reviews). Search by title, seller name, or email.
- **Transactions** — the full escrow ledger with buyer/seller names & emails. Admins can **Release funds** (complete an escrow hold, 95% to seller / 5% fee) or **Refund** (cancel the purchase, money back to buyer, listing re-activated).
- **Users** — every account with listing/sale/purchase counts, ratings, safety flags, a **Lift restriction** action to undo a Safety Bot selling pause, and a **Delete user** action that permanently removes the account and **all** of its data (listings, chats, messages, transactions, reviews, safety events). Admin accounts and your own account are protected from deletion.

All admin API routes (`/api/admin/*`) are guarded server-side: 401 when logged out, 403 for non-admins. Admins can also edit/delete **any** listing through the normal listing routes.

## 📊 Real Community Stats & Live Board

Landing-page numbers are **never hardcoded** — they're computed live from the database on every page load (`lib/community.js`):

- **Items & gigs listed** — `COUNT(listings)`
- **Verified neighbors** — `COUNT(users WHERE location_verified = 1)`
- **Trades completed** — `COUNT(transactions WHERE status = 'completed')`
- **Kept in the local economy** — `SUM(amount)` of completed transactions

The **Live Community Board** (landing page + Admin Overview) records every successful login/sign-up in `login_events` and shows:

- A **real-time activity feed** of who signed in / joined (polled every 8s)
- A **revenue-over-time bar chart** — TownTrade's 5% platform fee per day for the last 14 days, plus the all-time fee total (both computed from completed escrow transactions only)

Demo databases get a handful of backfilled demo events so the board is alive immediately; real sign-ins append from then on.

## 🛡️ Safety Bot (scam detection)

The **TownTrade Safety Bot** scans every chat message before delivery:

- **Credit cards** — 13–19 digit card numbers validated with the Luhn algorithm, plus card keywords (cvv, expiry, visa, mastercard…)
- **Bank/account details** — account numbers, routing numbers, IBAN, sort codes, 12+ digit runs
- **Phone numbers** — `+1 (555) 123-4567` style numbers and "call/text/whatsapp me" requests
- **Off-platform payments** — PayPal, Zelle, Venmo, CashApp, wire transfers, "outside the app"
- **Scam phrasing** — OTP/verification-code requests, gift cards, urgent payments, "kindly"…

When something is detected: the message is **blocked**, the bot posts a warning into the chat, the event is logged to `safety_events`, and the sender's **selling access is paused for 24 hours** — they can't post new listings, their active listings are hidden from the feed, and a banner appears on their profile. The restriction lifts automatically.

**Try it:** sign in as Demo Buyer → Chats → send `"My card number is 4242 4242 4242 4242"` → watch the bot respond and the profile show the pause banner.

## 💳 Stripe Connect Express (payments)

Payments are **real Stripe test-mode transactions** — no mocks. The escrow design uses **separate charges & transfers** (the pattern Stripe recommends for marketplaces):

1. **Seller onboarding** — Profile → Payout Settings → "Link Your Bank Account" calls `POST /api/stripe/onboarding`, which creates an **Express account** (`type: 'express'`, `transfers` capability) and returns a unique `accountLinks` onboarding URL. The seller completes bank verification on Stripe's site and is returned to `/profile?tab=payout&connect=return`. `GET /api/stripe/onboarding/status` checks `payouts_enabled` and flips the green **Account Connected** badge.
2. **Buy Now** — `POST /api/stripe/checkout` creates a **Checkout Session** that charges the buyer on TownTrade's balance. No transfer is created at this point, so the money genuinely sits in escrow. The success URL redirects back to `/listing/[id]?checkout=success&session_id=…`, where `/api/stripe/confirm` (and optionally the webhook) verifies the session server-side and creates the `escrow_hold` transaction.
3. **Release** — "Confirm Delivery / Release Funds" calls `/api/transactions/[id]/release`, which runs `stripe.transfers.create({ amount: 95%, destination: seller.stripe_account_id })`. TownTrade keeps the 5% platform fee. Admin release/refund routes apply the same real Stripe operations.

### Setup

```bash
cp .env.example .env.local   # then fill in your keys
```

| Variable | Where to get it |
|---|---|
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/test/apikeys (secret key, server-side only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Same page (publishable key, safe for the browser) |
| `STRIPE_WEBHOOK_SECRET` | https://dashboard.stripe.com/webhooks → add endpoint `/api/stripe/webhook` with events `checkout.session.completed`, `account.updated`, `charge.refunded` |
| `APP_URL` | Your deployed base URL (leave empty locally — auto-detected) |

**Test card:** `4242 4242 4242 4242`, any future expiry, any CVC. Express onboarding test data: any email, SSN `000-00-0000`, test bank routing `110000000` / account `000123456789`.

## 🔐 Security Notes (demo)

- All passwords are scrypt-hashed; sessions are random 256-bit tokens in httpOnly cookies.
- **Safety Bot human check** — every sign-in/sign-up must solve an addition question. The challenge is generated server-side (`lib/challenge.js`), stored in `login_challenges` with a 5-minute expiry, and consumed on first attempt (single-use). The answer never leaves the server's comparison logic. This is intentionally a simple placeholder — the architecture is ready to swap in reCAPTCHA, TOTP, or email OTP later without touching the auth flow.
- Ownership checks on every edit/delete/purchase/release/review endpoint.
- Payments run on **Stripe test mode** by default. Switch to live keys (`sk_live_…` / `pk_live_…`) plus a production webhook secret when launching — the escrow math (5% fee / 95% payout) is identical. Never put `sk_test_…` in client code; `.env.local` is git-ignored.
