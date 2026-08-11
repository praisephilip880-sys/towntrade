// Runs inside the worker thread owned by lib/db.js (hosted Turso mode).
//
// The app's data layer is synchronous (prepare/exec/transaction), but
// @libsql/client is asynchronous, so this worker owns the async client and
// answers the main thread synchronously through a MessagePort + SharedArrayBuffer
// signal (the main thread blocks on Atomics.wait while a query is in flight).
//
// Written as CommonJS (.cjs) so webpack/Next.js can trace it without ESM parse
// errors, and so `require` works the same on every Node version.
//
// Node 20 has no global WebSocket (added in Node 21, stable in 22), and the
// libsql web client needs it for libsql:// URLs. Polyfill from the pure-JS
// `ws` package when missing so this works on every Node version (including
// Vercel's default Node 20 runtime).
const { workerData } = require('node:worker_threads');

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = require('ws').WebSocket;
}

const { createClient } = require('@libsql/client/web');

const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.LIBSQL_URL;
const token = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;
const sig = workerData.sig;

let client = createClient({ url, authToken: token || undefined });

async function runQuery(msg) {
  if (msg.kind === 'execute') {
    return await client.execute({ sql: msg.sql, args: msg.args });
  }
  return await client.executeMultiple(msg.sql);
}

workerData.port.on('message', async (msg) => {
  let ok = false, value = null, error = null;
  try {
    value = await runQuery(msg);
    ok = true;
  } catch (err) {
    // Connection may have dropped — rebuild the client and retry once.
    try { await client.close(); } catch { /* already closed */ }
    client = createClient({ url, authToken: token || undefined });
    try {
      value = await runQuery(msg);
      ok = true;
    } catch (err2) {
      error = String((err2 && err2.message) || err2);
    }
  }
  try { workerData.port.postMessage({ id: msg.id, ok, value, error }); } catch { /* port closed */ }
  try { Atomics.add(sig, 0, 1); Atomics.notify(sig, 0); } catch { /* nothing waiting */ }
});
