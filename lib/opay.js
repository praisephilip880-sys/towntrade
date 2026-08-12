import { db } from './db';
import { OPAY_ACCOUNT_NAME, OPAY_ACCOUNT_NUMBER, OPAY_BANK } from './constants';
import { notifyAdmin, notifyUser } from './notify';
// Pure helpers shared with client components (no DB imports here!).
import { isValidAccountNumber, verifyAccountName } from './opay-shared';
export {
  OPAY_STATUS_LABELS,
  REFUND_QUESTIONS,
  calcFee,
  calcPayout,
  isValidAccountNumber,
  ngnEstimate,
  normalizeName,
  nameSimilarity,
  verifyAccountName,
} from './opay-shared';

/* ------------------------------- constants ------------------------------ */

export const OPAY_ACCOUNT = {
  number: OPAY_ACCOUNT_NUMBER,
  bank: OPAY_BANK,
  name: OPAY_ACCOUNT_NAME,
};

/* ------------------------------- queries -------------------------------- */

/** A seller's local payments (for My Sales / payout tab). */
export function fetchSellerPayments(userId) {
  return db
    .prepare(`SELECT p.id, p.amount, p.status, p.created_at AS createdAt, p.approved_at AS approvedAt,
         l.id AS listingId, l.title AS listingTitle,
         (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS listingImage,
         u.full_name AS buyerName,
         (SELECT account_number FROM seller_payouts sp WHERE sp.payment_id = p.id ORDER BY sp.id DESC LIMIT 1) AS accountNumber,
         (SELECT status FROM seller_payouts sp WHERE sp.payment_id = p.id ORDER BY sp.id DESC LIMIT 1) AS payoutStatus
       FROM opay_payments p
       JOIN listings l ON l.id = p.listing_id
       JOIN users u ON u.id = p.buyer_id
       WHERE p.seller_id = ?
       ORDER BY p.id DESC`)
    .all(userId)
    .map((r) => ({ ...r }));
}

/** A buyer's local payments (for My Purchases). */
export function fetchBuyerPayments(userId) {
  return db
    .prepare(`SELECT p.id, p.amount, p.status, p.buyer_note AS buyerNote, p.created_at AS createdAt, p.approved_at AS approvedAt,
         l.id AS listingId, l.title AS listingTitle,
         (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS listingImage,
         u.full_name AS sellerName,
         (SELECT COUNT(*) FROM refund_requests rr WHERE rr.payment_id = p.id) AS refundCount
       FROM opay_payments p
       JOIN listings l ON l.id = p.listing_id
       JOIN users u ON u.id = p.seller_id
       WHERE p.buyer_id = ?
       ORDER BY p.id DESC`)
    .all(userId)
    .map((r) => ({ ...r }));
}

/* ------------------------------- actions -------------------------------- */

/**
 * Record a buyer's manual OPay transfer. Called when the buyer presses
 * "I have made the transfer" — the money went to the platform's OPay account,
 * so this creates the escrow transaction and notifies admin + seller.
 */
export function recordOpayPayment({ buyerId, sellerId, listingId, amount, buyerNote = '' }) {
  const now = new Date().toISOString();
  return db.transaction(() => {
    // Atomic claim: exactly one buyer can flip the listing to sold. If the
    // update touches zero rows the listing was already claimed elsewhere.
    const sold = db.prepare(`UPDATE listings SET status = 'sold', updated_at = ? WHERE id = ? AND status = 'active'`).run(now, listingId);
    if (sold.changes !== 1) {
      throw new Error('This listing has already been sold — someone else got it first.');
    }
    const txResult = db
      .prepare(`INSERT INTO transactions (listing_id, buyer_id, seller_id, amount, status, payment_method, created_at)
         VALUES (?, ?, ?, ?, 'escrow_hold', 'opay', ?)`)
      .run(listingId, buyerId, sellerId, amount, now);
    const txId = Number(txResult.lastInsertRowid);
    const payResult = db
      .prepare(`INSERT INTO opay_payments (transaction_id, listing_id, buyer_id, seller_id, amount, status, buyer_note, created_at, paid_at)
         VALUES (?, ?, ?, ?, ?, 'buyer_paid', ?, ?, ?)`)
      .run(txId, listingId, buyerId, sellerId, amount, buyerNote, now, now);
    return { txId, paymentId: Number(payResult.lastInsertRowid) };
  })();
}

/** After recording, notify admin + seller about the incoming OPay payment. */
export function notifyOpayPaid(paymentId, buyerName, sellerId, amountCents) {
  const link = '/admin?tab=opay';
  notifyAdmin({
    type: 'payment',
    title: `OPay payment received from ${buyerName}`,
    body: `${buyerName} says they transferred ${(amountCents / 100).toFixed(2)} to the platform OPay account. Seller payout is now pending.`,
    link,
  });
  notifyUser(sellerId, {
    type: 'payment',
    title: 'A buyer paid via OPay — your payout is on the way! 💰',
    body: 'A buyer transferred funds for one of your listings. Add your payout account number so TownTrade can pay you once the buyer confirms delivery.',
    link: '/profile?tab=payout',
  });
}

/** Seller submits their payout account details; the bot verifies the name. */
export function submitSellerPayout({ paymentId, sellerId, accountNumber, accountHolder }) {
  const payment = db.prepare('SELECT id, seller_id AS sellerId, buyer_id AS buyerId, amount, status FROM opay_payments WHERE id = ?').get(paymentId);
  if (!payment) throw new Error('Payment not found.');
  if (payment.sellerId !== sellerId) throw new Error('This payment does not belong to you.');
  if (!isValidAccountNumber(accountNumber)) throw new Error('Please enter a valid account number (8–12 digits).');
  const profile = db.prepare('SELECT full_name AS fullName FROM users WHERE id = ?').get(sellerId);
  const check = verifyAccountName(accountHolder, profile.fullName);
  if (!check.match) {
    throw new Error(
      `The name “${accountHolder}” does not match your TownTrade profile name (${profile.fullName}). Please enter the exact name on the account.`
    );
  }
  const now = new Date().toISOString();
  const result = db
    .prepare(`INSERT INTO seller_payouts (payment_id, seller_id, account_number, account_holder, status, created_at, verified_at)
       VALUES (?, ?, ?, ?, 'verified', ?, ?)`)
    .run(paymentId, sellerId, String(accountNumber).trim(), accountHolder.trim(), now, now);
  db.prepare(`UPDATE opay_payments SET status = 'payout_verified' WHERE id = ? AND status = 'buyer_paid'`).run(paymentId);
  const buyer = db.prepare('SELECT full_name AS fullName FROM users WHERE id = ?').get(payment.buyerId);
  notifyAdmin({
    type: 'payout',
    title: `Seller payout details ready (${(payment.amount / 100).toFixed(2)})`,
    body: `${profile.fullName} added account ${accountNumber} (${accountHolder}) for payment #${paymentId} from ${buyer?.fullName ?? 'a buyer'}.`,
    link: '/admin?tab=opay',
  });
  return Number(result.lastInsertRowid);
}

/** Buyer confirms they received the item → admin can now pay the seller. */
export function approveOpayDelivery(paymentId, buyerId) {
  const payment = db.prepare('SELECT id, buyer_id AS buyerId, seller_id AS sellerId, amount, status FROM opay_payments WHERE id = ?').get(paymentId);
  if (!payment) throw new Error('Payment not found.');
  if (payment.buyerId !== buyerId) throw new Error('Not your purchase.');
  if (!['buyer_paid', 'payout_verified'].includes(payment.status)) {
    throw new Error(`This payment is already ${OPAY_STATUS_LABELS[payment.status]}.`);
  }
  const now = new Date().toISOString();
  db.prepare(`UPDATE opay_payments SET status = 'buyer_approved', approved_at = ? WHERE id = ?`).run(now, paymentId);
  const seller = db.prepare('SELECT full_name AS fullName FROM users WHERE id = ?').get(payment.sellerId);
  notifyAdmin({
    type: 'payment',
    title: `Buyer approved delivery — pay the seller!`,
    body: `Buyer confirmed they received the item. Transfer ${(payment.amount / 100).toFixed(2)} (less 5% fee) to ${seller.fullName} from your OPay account.`,
    link: '/admin?tab=opay',
  });
  notifyUser(payment.sellerId, {
    type: 'payment',
    title: '🎉 Buyer confirmed delivery!',
    body: 'The buyer says they received your item. Your payout is now with the admin for transfer — it is on its way.',
    link: '/profile?tab=payout',
  });
  return true;
}

/** Buyer requests a refund; the Safety Bot answers were collected client-side. */
export function submitRefundRequest({ paymentId, buyerId, reason, botAnswers, refundAccount = '' }) {
  const payment = db.prepare('SELECT id, buyer_id AS buyerId, seller_id AS sellerId, status FROM opay_payments WHERE id = ?').get(paymentId);
  if (!payment) throw new Error('Payment not found.');
  if (payment.buyerId !== buyerId) throw new Error('Not your purchase.');
  if (!['buyer_paid', 'payout_verified', 'buyer_approved'].includes(payment.status)) {
    throw new Error('This payment cannot be refunded in its current state.');
  }
  const now = new Date().toISOString();
  const result = db
    .prepare(`INSERT INTO refund_requests (payment_id, buyer_id, seller_id, reason, bot_answers, refund_account, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?)`)
    .run(paymentId, buyerId, payment.sellerId, reason, JSON.stringify(botAnswers || []), refundAccount.trim().slice(0, 20), now);
  db.prepare(`UPDATE opay_payments SET status = 'refund_requested', prior_status = status WHERE id = ?`).run(paymentId);
  const buyer = db.prepare('SELECT full_name AS fullName FROM users WHERE id = ?').get(buyerId);
  notifyAdmin({
    type: 'refund',
    title: `Refund request from ${buyer.fullName}`,
    body: `Reason: ${reason.slice(0, 120)}. Review the Safety Bot answers and chat with the buyer before approving.`,
    link: '/admin?tab=refunds',
  });
  notifyUser(payment.sellerId, {
    type: 'refund',
    title: '⚠️ A buyer requested a refund',
    body: 'The buyer requested a refund for one of your sales. TownTrade is reviewing it — you will be notified when it is resolved.',
    link: '/profile?tab=payout',
  });
  return Number(result.lastInsertRowid);
}

/* ----------------------------- admin actions ---------------------------- */

/** All OPay payments with seller payout + buyer status, newest first. */
export function fetchAllOpayPayments() {
  return db
    .prepare(`SELECT p.id, p.amount, p.status, p.buyer_note AS buyerNote, p.created_at AS createdAt, p.approved_at AS approvedAt,
         l.id AS listingId, l.title AS listingTitle,
         (SELECT li.data_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.position ASC, li.id ASC LIMIT 1) AS listingImage,
         b.id AS buyerId, b.full_name AS buyerName, b.email AS buyerEmail,
         s.id AS sellerId, s.full_name AS sellerName, s.email AS sellerEmail,
         (SELECT account_number FROM seller_payouts sp WHERE sp.payment_id = p.id ORDER BY sp.id DESC LIMIT 1) AS accountNumber,
         (SELECT account_holder FROM seller_payouts sp WHERE sp.payment_id = p.id ORDER BY sp.id DESC LIMIT 1) AS accountHolder,
         (SELECT status FROM seller_payouts sp WHERE sp.payment_id = p.id ORDER BY sp.id DESC LIMIT 1) AS payoutStatus
       FROM opay_payments p
       JOIN listings l ON l.id = p.listing_id
       JOIN users b ON b.id = p.buyer_id
       JOIN users s ON s.id = p.seller_id
       ORDER BY p.id DESC`)
    .all()
    .map((r) => ({ ...r }));
}

/** All refund requests with payment context, newest first. */
export function fetchRefundRequests() {
  return db
    .prepare(`SELECT r.id, r.reason, r.bot_answers AS botAnswers, r.status, r.created_at AS createdAt, r.resolved_at AS resolvedAt,
         p.id AS paymentId, p.amount, p.status AS paymentStatus,
         l.id AS listingId, l.title AS listingTitle,
         b.id AS buyerId, b.full_name AS buyerName, b.email AS buyerEmail,
         s.id AS sellerId, s.full_name AS sellerName,
         r.refund_account AS refundAccount
       FROM refund_requests r
       JOIN opay_payments p ON p.id = r.payment_id
       JOIN listings l ON l.id = p.listing_id
       JOIN users b ON b.id = r.buyer_id
       JOIN users s ON s.id = r.seller_id
       ORDER BY r.id DESC`)
    .all()
    .map((r) => ({ ...r, botAnswers: JSON.parse(r.botAnswers || '[]') }));
}

/** Admin marks an OPay payment as transferred to the seller. */
export function adminCompleteOpay(paymentId) {
  const payment = db.prepare('SELECT id, buyer_id AS buyerId, seller_id AS sellerId, amount, status FROM opay_payments WHERE id = ?').get(paymentId);
  if (!payment) throw new Error('Payment not found.');
  if (payment.status !== 'buyer_approved') {
    throw new Error('Only payments the buyer approved can be completed.');
  }
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare(`UPDATE opay_payments SET status = 'paid', resolved_at = ? WHERE id = ?`).run(now, paymentId);
    db.prepare(`UPDATE seller_payouts SET status = 'paid', paid_at = ? WHERE payment_id = ? AND status = 'verified'`).run(now, paymentId);
    db.prepare(`UPDATE transactions SET status = 'completed', completed_at = ? WHERE id = (SELECT transaction_id FROM opay_payments WHERE id = ?)`).run(now, paymentId);
  })();
  const seller = db.prepare('SELECT full_name AS fullName FROM users WHERE id = ?').get(payment.sellerId);
  const buyer = db.prepare('SELECT full_name AS fullName FROM users WHERE id = ?').get(payment.buyerId);
  notifyUser(payment.sellerId, {
    type: 'payment',
    title: '💸 Payout sent!',
    body: `The ${(payment.amount / 100).toFixed(2)} sale to ${buyer.fullName} has been paid out (95% to you, 5% platform fee).`,
    link: '/profile?tab=payout',
  });
  notifyUser(payment.buyerId, {
    type: 'payment',
    title: 'Transaction complete ✅',
    body: `Your purchase from ${seller.fullName} is complete. Funds released: 95% to the seller, 5% platform fee saved.`,
    link: '/profile?tab=purchases',
  });
  return true;
}

/** Admin approves or rejects a refund request. */
export function resolveRefund(refundId, approve) {
  const refund = db.prepare('SELECT id, payment_id AS paymentId, buyer_id AS buyerId, seller_id AS sellerId, status FROM refund_requests WHERE id = ?').get(refundId);
  if (!refund) throw new Error('Refund request not found.');
  if (refund.status !== 'submitted') throw new Error('This refund request is already resolved.');
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare(`UPDATE refund_requests SET status = ?, resolved_at = ? WHERE id = ?`).run(approve ? 'approved' : 'rejected', now, refundId);
    if (approve) {
      db.prepare(`UPDATE opay_payments SET status = 'refunded', resolved_at = ? WHERE id = ?`).run(now, refund.paymentId);
      db.prepare(`UPDATE transactions SET status = 'completed', completed_at = ? WHERE id = (SELECT transaction_id FROM opay_payments WHERE id = ?)`).run(now, refund.paymentId);
    } else {
      // Rejected: restore the payment to its pre-refund state.
      const prev = db.prepare('SELECT prior_status AS s FROM opay_payments WHERE id = ?').get(refund.paymentId);
      db.prepare(`UPDATE opay_payments SET status = COALESCE(?, 'buyer_paid') WHERE id = ?`).run(prev?.s, refund.paymentId);
    }
  })();
  const buyer = db.prepare('SELECT full_name AS fullName FROM users WHERE id = ?').get(refund.buyerId);
  if (approve) {
    notifyUser(refund.buyerId, {
      type: 'refund',
      title: '✅ Refund approved',
      body: 'Your refund request has been approved. The admin will transfer your money back to the account you paid from shortly.',
      link: '/profile?tab=purchases',
    });
    notifyUser(refund.sellerId, {
      type: 'refund',
      title: 'ℹ️ Refund processed',
      body: `The buyer ${buyer.fullName} requested a refund and it has been processed. The sale will not be paid out.`,
      link: '/profile?tab=sales',
    });
  } else {
    notifyUser(refund.buyerId, {
      type: 'refund',
      title: 'Refund request not approved',
      body: 'After review, your refund request was not approved. Reach out to support on WhatsApp if you need help.',
      link: '/profile?tab=purchases',
    });
  }
  return true;
}
