import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint — surfaces the REAL database error so deployment issues
 * are visible in the browser instead of a generic 500 page. Safe: it never
 * prints the auth token; only the URL scheme/host and the error text.
 */
export async function GET() {
  const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.LIBSQL_URL || '';
  const hasToken = Boolean(process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN);
  let scheme = 'none';
  try { scheme = new URL(url).protocol.replace(':', ''); } catch { /* keep 'none' */ }

  const startupError = globalThis.__towntradeDbStartupError || null;

  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM users').get();
    return NextResponse.json({
      ok: true,
      mode: url ? 'remote (Turso)' : 'local (SQLite file)',
      urlScheme: scheme,
      tokenSet: hasToken,
      users: row ? row.n : null,
      startupError,
      message: 'Database connection works.',
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      mode: url ? 'remote (Turso)' : 'local (SQLite file)',
      urlScheme: scheme,
      tokenSet: hasToken,
      urlHost: (() => { try { return new URL(url).host; } catch { return '(invalid URL)'; } })(),
      message: 'Database connection FAILED.',
      error: String(error && error.message || error),
      startupError,
    }, { status: 200 });
  }
}
