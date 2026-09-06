-- Multi-device checkpoint sync.
--
-- Previously `user_baselines` was keyed (user_id, symbol) — a single
-- checkpoint shared by every device using the same watchlist token.
-- That meant opening the watchlist on your phone silently consumed the
-- "since you last checked" state your laptop would otherwise have shown.
-- The watchlist ITEMS are still shared across devices (same user_id via
-- the same token, by design) — only the checkpoint becomes per-device.
--
-- This is a pure checkpoint cache (derived state, not a source of truth),
-- so a destructive migration is safe: nothing of value is lost by
-- resetting it, and every symbol simply rebuilds "insufficient baseline"
-- on first read after migrating, same as first ever load.

DROP TABLE IF EXISTS user_baselines;

CREATE TABLE IF NOT EXISTS device_baselines (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id       TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  last_seen_price DOUBLE PRECISION NOT NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id, symbol)
);
