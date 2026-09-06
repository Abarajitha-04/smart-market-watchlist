import { pool } from "./client.js";
import type { PricePoint } from "../engine/changeDetection.js";

export interface DbQuote {
  symbol: string;
  price: number;
  volume: number;
  sourceTimestamp: string;
  source: string;
}

export async function getLatestSnapshot(symbol: string): Promise<DbQuote | null> {
  const { rows } = await pool.query(
    `SELECT symbol, price, volume, source_timestamp, source
     FROM price_snapshots WHERE symbol = $1
     ORDER BY source_timestamp DESC LIMIT 1`,
    [symbol]
  );
  if (rows.length === 0) return null;
  return {
    symbol: rows[0].symbol,
    price: Number(rows[0].price),
    volume: Number(rows[0].volume),
    sourceTimestamp: rows[0].source_timestamp.toISOString(),
    source: rows[0].source,
  };
}

export async function insertSnapshot(q: DbQuote): Promise<"inserted" | "duplicate"> {
  try {
    await pool.query(
      `INSERT INTO price_snapshots (symbol, price, volume, source_timestamp, source)
       VALUES ($1, $2, $3, $4, $5)`,
      [q.symbol, q.price, q.volume, q.sourceTimestamp, q.source]
    );
    return "inserted";
  } catch (err: any) {
    if (err?.code === "23505") return "duplicate"; // unique_violation
    throw err;
  }
}

/** Rolling window of snapshots for a symbol, oldest first — feeds the engine directly. */
export async function getRecentWindow(symbol: string, limit: number): Promise<PricePoint[]> {
  const { rows } = await pool.query(
    `SELECT price, volume, source_timestamp FROM price_snapshots
     WHERE symbol = $1 ORDER BY source_timestamp DESC LIMIT $2`,
    [symbol, limit]
  );
  return rows
    .map((r) => ({ price: Number(r.price), volume: Number(r.volume), timestamp: r.source_timestamp.toISOString() }))
    .reverse();
}

export async function getDistinctWatchedSymbols(): Promise<string[]> {
  const { rows } = await pool.query(`SELECT DISTINCT symbol FROM watchlist_items`);
  return rows.map((r) => r.symbol);
}

export async function addWatchlistItem(userId: string, symbol: string): Promise<"created" | "duplicate"> {
  try {
    await pool.query(`INSERT INTO watchlist_items (user_id, symbol) VALUES ($1, $2)`, [userId, symbol]);
    return "created";
  } catch (err: any) {
    if (err?.code === "23505") return "duplicate";
    throw err;
  }
}

export async function removeWatchlistItem(userId: string, symbol: string): Promise<void> {
  await pool.query(`DELETE FROM watchlist_items WHERE user_id = $1 AND symbol = $2`, [userId, symbol]);
}

export async function getWatchlistSymbols(userId: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT symbol FROM watchlist_items WHERE user_id = $1 ORDER BY added_at ASC`,
    [userId]
  );
  return rows.map((r) => r.symbol);
}

/**
 * Checkpoint read, scoped per-device. See migrations/002_device_baselines.sql:
 * the watchlist ITEMS are shared across every device on the same account
 * (same user_id), but "since you last checked" is tracked independently
 * per device so checking on your phone never silently consumes what your
 * laptop would otherwise flag.
 */
export async function getBaseline(userId: string, deviceId: string, symbol: string): Promise<number | null> {
  const { rows } = await pool.query(
    `SELECT last_seen_price FROM device_baselines WHERE user_id = $1 AND device_id = $2 AND symbol = $3`,
    [userId, deviceId, symbol]
  );
  return rows.length ? Number(rows[0].last_seen_price) : null;
}

/** Sets the checkpoint for this device. This is the exact moment "since you last checked" resets — for this device only. */
export async function upsertBaseline(userId: string, deviceId: string, symbol: string, price: number): Promise<void> {
  await pool.query(
    `INSERT INTO device_baselines (user_id, device_id, symbol, last_seen_price, last_seen_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id, device_id, symbol)
     DO UPDATE SET last_seen_price = EXCLUDED.last_seen_price, last_seen_at = now()`,
    [userId, deviceId, symbol, price]
  );
}

export async function findUserByToken(token: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM users WHERE token = $1`, [token]);
  return rows.length ? rows[0].id : null;
}

export async function createUser(token: string): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO users (token) VALUES ($1) RETURNING id`,
    [token]
  );
  return rows[0].id;
}
