-- Smart Market Watchlist — initial schema
-- Deliberately 4 tables. See decision log for why.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol    TEXT NOT NULL,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);

-- Append-only. Raw source of truth. Never updated, only inserted.
CREATE TABLE IF NOT EXISTS price_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol           TEXT NOT NULL,
  source_timestamp TIMESTAMPTZ NOT NULL,
  ingested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  price            DOUBLE PRECISION NOT NULL,
  volume           DOUBLE PRECISION NOT NULL,
  source           TEXT NOT NULL,
  UNIQUE (symbol, source_timestamp, source)
);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_symbol_ts
  ON price_snapshots (symbol, source_timestamp DESC);

-- This table IS the "what changed" engine: the checkpoint every new read
-- is diffed against, per user per stock. Updated on read, not on a timer.
CREATE TABLE IF NOT EXISTS user_baselines (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol          TEXT NOT NULL,
  last_seen_price DOUBLE PRECISION NOT NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, symbol)
);
