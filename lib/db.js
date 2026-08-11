import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
// The /web entry is the pure-JavaScript libSQL client (no native bindings),
// so installs and serverless builds work everywhere — including Windows and
// Vercel. The main @libsql/client entry pulls in a native .node binary.
import { createClient } from '@libsql/client/web';
import { hashPassword } from './password.js';
import { svgDataUrl } from './seedImages.js';

// The Node built-in (node:sqlite) only exists on Node >= 22.5. Load it lazily so
// this module still imports cleanly on older runtimes (e.g. Vercel's Node 20)
// when the app is running against a hosted cloud database instead.
const require = createRequire(import.meta.url);

// Where the local SQLite file lives. Override with DATA_DIR when the database
// must live on a mounted persistent disk (e.g. Render/Railway attach a volume).
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');

// Hosted cloud database (Turso/libSQL). When set, all data lives in the cloud,
// which is required on serverless platforms (Vercel) whose filesystem is
// read-only and cannot persist a SQLite file. Accepts Turso's dashboard names.
const TURSO_URL = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.LIBSQL_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

const globalForDb = globalThis;

/**
 * SQLite can throw 'database is locked' when several processes (e.g. Next.js
 * build workers, or a webhook + success-page racing) touch the file at once.
 * Retry the operation with a tiny backoff so transient contention never fails
 * a request or a build. (Only relevant for the local file backend.)
 */
function retryOnLock(fn, attempts = 25) {
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    }
    catch (error) {
      if (i < attempts - 1 && String(error.message).includes('database is locked')) {
        const until = Date.now() + 200;
        while (Date.now() < until) { /* busy-wait */ }
        continue;
      }
      throw error;
    }
  }
}

/** Shared BEGIN/COMMIT/ROLLBACK transaction wrapper for either backend. */
function makeTransaction(adapter) {
  return (fn) => (...args) => {
    adapter.exec('BEGIN');
    try {
      const result = fn(...args);
      adapter.exec('COMMIT');
      return result;
    }
    catch (error) {
      try {
        adapter.exec('ROLLBACK');
      }
      catch { /* already rolled back */ }
      throw error;
    }
  };
}

/** Local backend: Node's built-in SQLite file (no native compilation needed). */
function createLocalDb() {
  const { DatabaseSync } = require('node:sqlite');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const instance = new DatabaseSync(path.join(DATA_DIR, 'towntrade.db'));
  instance.exec('PRAGMA journal_mode = WAL;');
  instance.exec('PRAGMA foreign_keys = ON;');
  // Wait up to 5s for a concurrent writer instead of failing instantly with
  // 'database is locked' (matters during builds and under production load).
  instance.exec('PRAGMA busy_timeout = 5000;');
  instance.transaction = makeTransaction(instance);
  return instance;
}

/**
 * Remote backend: hosted Turso/libSQL over the network. Keeps the exact same
 * prepare/exec/transaction surface the rest of the app already uses, so no
 * query code changes. Works on serverless platforms (Vercel).
 */
function createRemoteDb() {
  const client = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN || undefined,
  });
  const adapter = {
    prepare(sql) {
      return {
        get: (...args) => client.execute({ sql, args }).rows[0],
        all: (...args) => client.execute({ sql, args }).rows,
        run: (...args) => {
          const result = client.execute({ sql, args });
          return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid };
        },
      };
    },
    exec(sql) {
      // executeMultiple runs every statement in the batch (schema/migrations).
      client.executeMultiple(sql);
    },
    close() {
      client.close();
    },
  };
  adapter.transaction = makeTransaction(adapter);
  return adapter;
}

function createDb() {
  if (TURSO_URL) {
    console.log('[TownTrade] Using hosted cloud database (Turso/libSQL).');
    return createRemoteDb();
  }
  try {
    return retryOnLock(createLocalDb);
  }
  catch (error) {
    console.error(
      '[TownTrade] Could not open a local SQLite database. On serverless platforms (Vercel) ' +
      'add the TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables (free Turso DB) ' +
      'so data lives in the cloud. Local development keeps working with the built-in SQLite file.'
    );
    throw error;
  }
}

export const db = globalForDb.__towntradeDb ?? (globalForDb.__towntradeDb = createDb());

const daysAgoIso = (days, hourOffset = 0) => new Date(Date.now() - days * 24 * 60 * 60 * 1000 + hourOffset * 60 * 60 * 1000).toISOString();
/* ------------------------------------------------------------------ */
/*  SCHEMA                                                             */
/* ------------------------------------------------------------------ */
export function initializeSchema() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name         TEXT    NOT NULL,
      email             TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash     TEXT    NOT NULL,
      neighborhood      TEXT    NOT NULL,
      location_verified INTEGER NOT NULL DEFAULT 0,
      bank_connected    INTEGER NOT NULL DEFAULT 0,
      is_admin          INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT    NOT NULL,
      expires_at TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS listings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL,
      price       INTEGER NOT NULL DEFAULT 0,
      category    TEXT    NOT NULL CHECK (category IN ('items', 'gigs', 'free')),
      status      TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold')),
      created_at  TEXT    NOT NULL,
      updated_at  TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_listings_status  ON listings(status);
    CREATE INDEX IF NOT EXISTS idx_listings_user    ON listings(user_id);
    CREATE INDEX IF NOT EXISTS idx_listings_cat     ON listings(category);

    CREATE TABLE IF NOT EXISTS listing_images (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      data_url   TEXT    NOT NULL,
      position   INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id);

    CREATE TABLE IF NOT EXISTS chats (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      buyer_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seller_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT    NOT NULL,
      updated_at TEXT    NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_uniq ON chats(listing_id, buyer_id, seller_id);

    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id    INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      sender_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content    TEXT    NOT NULL,
      created_at TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);

    CREATE TABLE IF NOT EXISTS transactions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id   INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      buyer_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seller_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount       INTEGER NOT NULL,
      status       TEXT    NOT NULL DEFAULT 'escrow_hold' CHECK (status IN ('escrow_hold', 'completed')),
      created_at   TEXT    NOT NULL,
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_buyer  ON transactions(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id);

    CREATE TABLE IF NOT EXISTS reviews (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id  INTEGER REFERENCES listings(id) ON DELETE SET NULL,
      reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment     TEXT    NOT NULL DEFAULT '',
      created_at  TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);

    CREATE TABLE IF NOT EXISTS safety_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      chat_id    INTEGER REFERENCES chats(id) ON DELETE SET NULL,
      category   TEXT    NOT NULL,
      snippet    TEXT    NOT NULL DEFAULT '',
      action     TEXT    NOT NULL DEFAULT 'blocked_and_restricted',
      created_at TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_safety_events_user ON safety_events(user_id);

    -- Every successful login/sign-up is recorded so the community board can
    -- show real, timestamped activity (who signed in, when, how often).
    CREATE TABLE IF NOT EXISTS login_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT    NOT NULL DEFAULT 'signin' CHECK (event_type IN ('signin', 'signup')),
      created_at TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_events_created ON login_events(created_at);

    -- Safety Bot human check: a single-use addition challenge issued at sign-in.
    -- Server-side answers + expiry; replaced by stronger security later.
    CREATE TABLE IF NOT EXISTS login_challenges (
      id         TEXT    PRIMARY KEY,
      a          INTEGER NOT NULL,
      b          INTEGER NOT NULL,
      answer     INTEGER NOT NULL,
      expires_at TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_challenges_expires ON login_challenges(expires_at);
  `);
}

/**
 * Add columns to an existing table if they are missing (safe migration).
 * Uses the pragma_table_info table-valued function so it works identically on
 * the local SQLite file AND hosted libSQL (Turso).
 */
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`SELECT name FROM pragma_table_info(?)`).all(table);
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

/** Run once at startup: migrate older databases and ensure the Safety Bot exists. */
function migrate() {
  ensureColumn('users', 'safety_flags', "safety_flags INTEGER NOT NULL DEFAULT 0");
  // Stripe Connect Express: the seller's connected account id, stored once onboarding completes.
  ensureColumn('users', 'stripe_account_id', "stripe_account_id TEXT");
  // Optional profile picture, stored as a compressed JPEG data URL.
  ensureColumn('users', 'avatar', "avatar TEXT");
  // Escrow bookkeeping: which Stripe objects back each marketplace transaction.
  ensureColumn('transactions', 'stripe_checkout_session_id', "stripe_checkout_session_id TEXT");
  ensureColumn('transactions', 'stripe_payment_intent_id', "stripe_payment_intent_id TEXT");
  ensureColumn('transactions', 'stripe_transfer_id', "stripe_transfer_id TEXT");
  // One Stripe Checkout Session can back at most one escrow transaction.
  // Makes finalizePaidSession race-proof when webhook + success page both fire.
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_checkout_session
    ON transactions(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL`);
  ensureColumn('users', 'selling_restricted_until', "selling_restricted_until TEXT");
  ensureColumn('users', 'selling_restricted_reason', "selling_restricted_reason TEXT");
  ensureColumn('users', 'is_admin', "is_admin INTEGER NOT NULL DEFAULT 0");

  // The Safety Bot is a special user (id 0) that never logs in.
  db.prepare(`
    INSERT OR IGNORE INTO users (id, full_name, email, password_hash, neighborhood, location_verified, bank_connected, created_at)
    VALUES (0, 'TownTrade Safety Bot', 'safety-bot@towntrade.local', '', 'TownTrade HQ', 1, 0, ?)
  `).run(new Date().toISOString());

  // The platform owner account has admin powers (manage any listing, oversee transactions).
  grantOwnerAdmin();

  // Backfill demo login events for pre-existing databases so the community
  // board is alive immediately (safe no-op once events exist).
  const eventCount = db.prepare('SELECT COUNT(*) AS n FROM login_events').get().n;
  if (eventCount === 0) {
    const demo = db
      .prepare(`SELECT u.id, u.email FROM users u WHERE u.id > 0 AND u.email LIKE '%@towntrade.local' ORDER BY u.id ASC`)
      .all();
    const insertEvent = db.prepare(`INSERT INTO login_events (user_id, event_type, created_at) VALUES (?, ?, ?)`);
    demo.forEach((u, i) => {
      insertEvent.run(u.id, 'signup', daysAgoIso(60 - i * 10));
      insertEvent.run(u.id, 'signin', daysAgoIso(i));
    });
  }
}

/** The platform owner email that receives admin powers. */
export const OWNER_EMAIL = 'praisephilip880@gmail.com';

/** Grant admin powers to the platform owner account whenever it exists. */
export function grantOwnerAdmin() {
  db.prepare(`UPDATE users SET is_admin = 1 WHERE email = ?`).run(OWNER_EMAIL);
}

/* ------------------------------------------------------------------ */
/*  DEMO DATA LIFECYCLE                                                */
/* ------------------------------------------------------------------ */

/** Demo accounts/listings are auto-removed once the community passes this size. */
export const DEMO_PURGE_THRESHOLD = 50;

/** Demo seed users are identified by their @towntrade.local email domain. */
const DEMO_EMAIL_PATTERN = '%@towntrade.local';

/** Total registered users (excludes the Safety Bot system account, id 0). */
export function countUsers() {
  return db.prepare('SELECT COUNT(*) AS n FROM users WHERE id > 0').get().n;
}

/**
 * Delete all demo accounts. Foreign-key cascades clean up their listings,
 * images, chats, messages, transactions, reviews and safety events.
 * @returns {number} number of demo users removed
 */
export function purgeDemoData() {
  return db
    .prepare(`DELETE FROM users WHERE id > 0 AND email LIKE ?`)
    .run(DEMO_EMAIL_PATTERN).changes;
}

/**
 * If the community has grown past the demo threshold, remove demo content.
 * Called on startup and after every registration.
 */
export function purgeDemoIfOverLimit() {
  if (countUsers() > DEMO_PURGE_THRESHOLD) {
    const removed = purgeDemoData();
    if (removed > 0) {
      console.log(`[TownTrade] ${countUsers()} users on platform — past the ${DEMO_PURGE_THRESHOLD} threshold. Removed ${removed} demo account(s) and their listings.`);
    }
    return removed;
  }
  return 0;
}
/* ------------------------------------------------------------------ */
/*  SEED DATA (simulated workflows — no live API keys required)        */
/* ------------------------------------------------------------------ */
export function seedIfEmpty() {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
    if (n > 0)
        return;
    const insertUser = db.prepare(`
    INSERT INTO users (full_name, email, password_hash, neighborhood, location_verified, bank_connected, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    const makeUser = (fullName, email, neighborhood, verified, bank, daysAgo) => Number(insertUser.run(fullName, email, hashPassword('password123'), neighborhood, verified, bank, daysAgoIso(daysAgo))
        .lastInsertRowid);
    // All demo accounts share the password:  password123
    const miaId = makeUser('Mia Chen', 'mia@towntrade.local', 'Riverside', 1, 1, 60);
    const jayId = makeUser('Jay Patel', 'jay@towntrade.local', 'Maple Grove', 1, 1, 58);
    const buyerId = makeUser('Demo Buyer', 'buyer@towntrade.local', 'Downtown', 1, 0, 40);
    const sofiaId = makeUser('Sofia Reyes', 'sofia@towntrade.local', 'Hillcrest', 1, 0, 30);
    const liamId = makeUser('Liam Walker', 'liam@towntrade.local', 'Old Town', 1, 0, 21);
    const insertListing = db.prepare(`
    INSERT INTO listings (user_id, title, description, price, category, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const insertImage = db.prepare(`
    INSERT INTO listing_images (listing_id, data_url, position) VALUES (?, ?, ?)
  `);
    const makeListing = (userId, title, description, price, category, emoji, status, daysAgo) => {
        const created = daysAgoIso(daysAgo, -Math.floor(Math.random() * 8));
        const id = Number(insertListing.run(userId, title, description, price, category, status, created, created).lastInsertRowid);
        insertImage.run(id, svgDataUrl(title, emoji, category), 0);
        if (Math.random() > 0.65) {
            insertImage.run(id, svgDataUrl(title, emoji, category), 1);
        }
        return id;
    };
    // ---- Active listings (feed) ----
    makeListing(jayId, 'Mid-Century Coffee Table', 'Solid walnut coffee table in excellent condition. Small hairline scratch on the top (shown in photos), otherwise perfect. Pickup in Maple Grove.', 12000, 'items', '🛋️', 'active', 1);
    makeListing(miaId, 'Moving Boxes — Take Them All (Free)', 'About 40 assorted moving boxes plus a roll of packing tape. Sturdy, one-time use. Free to a good home — pickup in Riverside.', 0, 'free', '📦', 'active', 2);
    makeListing(miaId, 'Dog Walking Evenings', 'Experienced dog walker, fully insured. 30-minute evening walks around Riverside Park, $18 per walk or $65 for a 5-walk pack. References available.', 1800, 'gigs', '🐕', 'active', 3);
    makeListing(jayId, 'Road Bike Tune-Up', 'Full tune-up: brake adjustment, gear indexing, drivetrain clean & lube, tire pressure. Same-day turnaround on weekdays. Maple Grove.', 3500, 'gigs', '🚴', 'active', 4);
    makeListing(miaId, 'Desk Lamp', 'LED desk lamp with three color temperatures and USB charging port. Works great, upgrading to a standing lamp.', 2500, 'items', '💡', 'active', 5);
    makeListing(miaId, 'Plant Cuttings Bundle (Free)', 'Pothos, monstera, and spider plant cuttings — rooted and ready to pot. Come grab a handful, first come first served.', 0, 'free', '🪴', 'active', 6);
    makeListing(jayId, 'Deck Power-Washing', 'Pressure wash your deck, patio, or driveway. Includes basic stain removal. $60 for a standard deck, quotes for larger areas.', 6000, 'gigs', '🚿', 'active', 7);
    makeListing(miaId, 'Vintage Film Camera', 'Canon AE-1 in full working order. Light meter functional, comes with two lenses and a leather case. A true classic.', 15000, 'items', '📷', 'active', 8);
    makeListing(jayId, 'Baby Stroller (Free)', 'Gently used umbrella stroller, folds flat, easy to clean. Moving on up, hoping another family can use it.', 0, 'free', '🍼', 'active', 9);
    makeListing(miaId, 'Home-Cooked Meal Prep (Week)', 'Weekly meal prep: 5 healthy lunches delivered to your door each Monday. Local ingredients, dietary needs welcome. $55/week.', 5500, 'gigs', '🍲', 'active', 10);
    makeListing(jayId, 'Turntable + Vinyl Collection', 'Audio-Technica turntable plus ~30 records (jazz, rock, soul). Everything tested and in great shape. Selling as a bundle.', 8000, 'items', '💿', 'active', 11);
    // ---- Sold listings (history for purchases/sales/reviews) ----
    const bookshelfId = makeListing(miaId, 'Vintage Oak Bookshelf', 'Solid oak bookshelf, 6 shelves, very sturdy. Beautiful warm tone. Pickup in Riverside — bring a friend, it is heavy!', 8500, 'items', '📚', 'sold', 20);
    const deskId = makeListing(jayId, 'IKEA Desk + Chair', 'White IKEA desk with an adjustable chair. Minor scuffs on the desk surface, totally functional. Perfect starter setup.', 9500, 'items', '🪑', 'sold', 14);
    const mealPrepId = makeListing(miaId, 'Home-Cooked Meal Prep (Week)', 'Weekly meal prep: 5 healthy lunches delivered to your door each Monday. Local ingredients, dietary needs welcome. $55/week.', 5500, 'gigs', '🍲', 'sold', 16);
    const mowingId = makeListing(jayId, 'Garden Lawn Mowing', 'Weekly lawn mowing and edging for your front and back yard. $40 per visit, monthly plans available.', 4000, 'gigs', '🌿', 'sold', 12);
    const lampId = makeListing(jayId, 'Smart Lamp', 'WiFi smart lamp with app control, works with Alexa and Google Home. Barely used.', 2500, 'items', '💡', 'sold', 9);
    const bicycleId = makeListing(jayId, 'Kids Bicycle (Free)', '18-inch kids bike with training wheels. Frame is a little scuffed but it rides smoothly. Free to a family in need.', 0, 'free', '🚲', 'sold', 7);
    // ---- Transactions (escrow workflow) ----
    const insertTx = db.prepare(`
    INSERT INTO transactions (listing_id, buyer_id, seller_id, amount, status, created_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    const tx = (listingId, buyer, seller, amount, status, daysAgo) => insertTx.run(listingId, buyer, seller, amount, status, daysAgoIso(daysAgo), status === 'completed' ? daysAgoIso(daysAgo, 5) : null);
    tx(bookshelfId, buyerId, miaId, 8500, 'completed', 18); // Demo Buyer: completed purchase (ready to rate Mia)
    tx(deskId, buyerId, jayId, 9500, 'escrow_hold', 6); // Demo Buyer: pending escrow → "Confirm Delivery / Release Funds"
    tx(mealPrepId, sofiaId, miaId, 5500, 'completed', 14);
    tx(mowingId, liamId, jayId, 4000, 'completed', 10);
    tx(lampId, sofiaId, jayId, 2500, 'completed', 8);
    tx(bicycleId, liamId, jayId, 0, 'completed', 5);
    // ---- Reviews (only after completed transactions) ----
    const insertReview = db.prepare(`
    INSERT INTO reviews (listing_id, reviewer_id, reviewee_id, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
    const review = (listingId, reviewer, reviewee, rating, comment, daysAgo) => insertReview.run(listingId, reviewer, reviewee, rating, comment, daysAgoIso(daysAgo));
    review(mealPrepId, sofiaId, miaId, 5, 'Honestly incredible meal prep — worth every penny. Mia is a gem of a neighbor.', 12);
    review(bookshelfId, liamId, miaId, 5, 'Bought a bookshelf from Mia last month — smooth pickup and it looks even better in person.', 8);
    review(mowingId, liamId, jayId, 4, 'Lawn looks great! Ran a little late one week but did a thorough job.', 9);
    review(lampId, sofiaId, jayId, 5, 'Fast replies, easy pickup. The lamp is in perfect condition.', 7);
    review(bicycleId, liamId, jayId, 4, 'Free bike for the kids — thank you Jay! Frame needs a little love but it rides great.', 4);
    // ---- Chats + messages ----
    const insertChat = db.prepare(`
    INSERT INTO chats (listing_id, buyer_id, seller_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
    const insertMessage = db.prepare(`
    INSERT INTO messages (chat_id, sender_id, content, created_at) VALUES (?, ?, ?, ?)
  `);
    const bookshelfChat = Number(insertChat.run(bookshelfId, buyerId, miaId, daysAgoIso(6), daysAgoIso(3)).lastInsertRowid);
    insertMessage.run(bookshelfChat, buyerId, 'Hi Mia! Is the bookshelf still available?', daysAgoIso(6));
    insertMessage.run(bookshelfChat, miaId, 'Hi! Yes it is — it is in great condition, solid oak.', daysAgoIso(6, 2));
    insertMessage.run(bookshelfChat, buyerId, 'Perfect, can I come by Saturday morning?', daysAgoIso(5));
    insertMessage.run(bookshelfChat, miaId, 'Saturday works great. I will send you my address!', daysAgoIso(3));
    const deskChat = Number(insertChat.run(deskId, buyerId, jayId, daysAgoIso(4), daysAgoIso(2)).lastInsertRowid);
    insertMessage.run(deskChat, buyerId, 'Hey Jay, is the IKEA desk still available?', daysAgoIso(4));
    insertMessage.run(deskChat, jayId, 'Hey! Yes, it is. It has minor scuffs but everything works.', daysAgoIso(4, 3));
    insertMessage.run(deskChat, buyerId, 'Great — I will take it. When can I pick it up?', daysAgoIso(2));
    // ---- Login / sign-up events (real feed for the community board) ----
    const insertLoginEvent = db.prepare(`
    INSERT INTO login_events (user_id, event_type, created_at) VALUES (?, ?, ?)
  `);
    insertLoginEvent.run(miaId, 'signup', daysAgoIso(60));
    insertLoginEvent.run(jayId, 'signup', daysAgoIso(58));
    insertLoginEvent.run(buyerId, 'signup', daysAgoIso(40));
    insertLoginEvent.run(sofiaId, 'signup', daysAgoIso(30));
    insertLoginEvent.run(liamId, 'signup', daysAgoIso(21));
    insertLoginEvent.run(buyerId, 'signin', daysAgoIso(4));
    insertLoginEvent.run(miaId, 'signin', daysAgoIso(3));
    insertLoginEvent.run(jayId, 'signin', daysAgoIso(2));
    insertLoginEvent.run(buyerId, 'signin', daysAgoIso(1, 4));
    insertLoginEvent.run(miaId, 'signin', daysAgoIso(0, -6));
    insertLoginEvent.run(buyerId, 'signin', daysAgoIso(0, -2));
    insertLoginEvent.run(jayId, 'signin', daysAgoIso(0, -1));
}
initializeSchema();
// Startup mutations are wrapped so concurrent processes (build workers) retry
// instead of failing when they race to seed/migrate a fresh database.
retryOnLock(() => { seedIfEmpty(); migrate(); purgeDemoIfOverLimit(); });
