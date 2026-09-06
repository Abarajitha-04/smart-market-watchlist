# Smart Market Watchlist — Locked Decision Log

Working spec for Code, by Groww 2026 (solo, 72-hour build). This is the single source of truth reconciling the earlier planning docs; supersedes open questions in those docs where a decision has been made below.

## Product thesis
"Don't make me re-scan my whole watchlist — tell me what actually deserves my attention since I last looked." Every feature decision is filtered through this sentence.

## Meaningful-change definition
Two deterministic signals, both computed relative to each stock's own recent history — never a flat threshold:

- **Price anomaly (z-score):** current % move ÷ rolling standard deviation of % returns over the last 20 snapshots.
- **Volume anomaly (ratio):** current volume ÷ rolling average volume over the same 20-snapshot window.

**Tiering rule (exact, defensible in one sentence):**
- HIGH if |z-score| ≥ 2, or (|z-score| ≥ 1 and volume ratio ≥ 2.5)
- MODERATE if |z-score| ≥ 1, or volume ratio ≥ 1.5
- NORMAL otherwise

**Cold start:** fewer than 20 snapshots for a symbol → show raw numbers only, labeled "insufficient history." Never fabricate a tier from partial data.

News/sentiment signals explicitly excluded from v1 — stated as a future direction, not attempted.

## "Since last checked" semantics
Checkpoint = last time the user loaded that watchlist, stored per-user-per-device-per-stock in `device_baselines` (originally scoped as per-user-per-stock in `user_baselines`; upgraded to per-device mid-build once real time margin existed — see README trade-offs), updated on read (`GET /watchlist`).

## Architecture
Monolith, not microservices. Non-negotiable rule: the change-detection engine is pure, deterministic, zero I/O, zero AI — nothing (including a slow or wrong AI call) can corrupt whether something counts as a meaningful change. AI sits after the decision, narration-only, fails open to raw numbers on timeout/error.

## Stack
- Frontend: React + Vite + TanStack Query (chosen specifically for its stale-time/refetch model matching "return later and see what changed")
- Backend: Node + Express + TypeScript, zod for shared runtime validation
- Database: Postgres only — no Redis; at solo-project scale the per-instrument dedup in the ingestion loop already gives the "compute once per instrument" property Redis was originally scoped for, without the operational dependency
- Real-time delivery: polling every 15–30s, not WebSockets
- Deployment: Render/Railway (backend+DB) + Vercel (frontend)

## Schema (4 tables)
- `users` — id (uuid), token (unique), created_at
- `watchlist_items` — id, user_id (fk), symbol, added_at — unique (user_id, symbol)
- `price_snapshots` — id, symbol, source_timestamp, ingested_at, price, volume, source — append-only, index (symbol, source_timestamp)
- `device_baselines` — user_id (fk), device_id, symbol, last_seen_price, last_seen_at — PK (user_id, device_id, symbol)

Per-quote fields kept minimal: symbol, price (last traded), volume, source_timestamp, ingested_at, source. No OHLC, no market status field. Equities-only scope.

## API contract
- `POST /watchlist` `{symbol}` → add; 409 on duplicate
- `DELETE /watchlist/:symbol` → remove
- `GET /watchlist` → per item: latest price/volume, tier, evidence object, `is_stale` flag; also updates this device's `device_baselines` row after computing the diff (this is where the checkpoint resets — for this device only, see README)
- `GET /watchlist/:symbol/evidence` → full breakdown (z-score, volume ratio, window, thresholds used) — backs the "why am I seeing this" UI
- `GET /health` → deploy/demo verification
- `GET /status` → provider health + last ingestion time (added for the visible reliability demo)

## Explicitly cut from v1
Real auth (token only), multi-asset support, per-user configurable thresholds, notifications/alerts, event clustering, microservices, news/sentiment signals.

## Edge cases to handle
- Market-closed / pre-market / weekend — a non-updating quote here is not "stale"; needs its own explicit state, not the staleness banner.
- Newly added symbol with no baseline yet — show "just added, building history," never a false meaningful-change flag on first read.
- Out-of-order ingestion — reject/ignore any snapshot older than the currently stored timestamp for that symbol, **within the same source** (a real provider's genuine exchange timestamp must never lose to a mock feed's synthetic "now" stamp — see README trade-offs / commit history for why this was tightened mid-build).
- Duplicate snapshot at the same timestamp — dedupe on ingest.
- Zero/negative/missing price from provider — reject the write, keep last-known-good.
- Remove-then-re-add a symbol — fresh baseline, no residual state.
- Double-submit on add (double-click) — idempotent, no duplicate-key error surfaced to the user.
- Provider rate-limit/429 — fall back to the seeded mock feed automatically, with a client-side sliding-window limiter that fails fast on a known-exhausted budget instead of wasting a real request, plus round-robin fairness rotation across symbols so the same symbols don't always win a limited budget.

## Additional functionality (folded into scope — low effort, real payoff)
- Explicit "no significant changes" state — actively tells the user nothing happened, not an empty list.
- Freshness timestamp per stock, staleness threshold stated explicitly (e.g., flagged if last update >2 minutes old during market hours).
- In-app "system status" strip — provider health, last ingestion time — makes the reliability story visible during the demo, not just described.
- Optional one-line AI digest at the top of the watchlist ("2 stocks worth a look since you last checked") — fits the fail-open AI-narration rule.
- Per-symbol data-source badge ("Simulated data") — makes a provider-coverage gap (e.g. NSE/BSE requiring a paid Twelve Data plan) visible instead of silently indistinguishable from real data.
- Multi-device checkpoint sync via a shareable sync code — see README.

## Stretch goals (P2 — only if core is done and stable)
- Manual "mark as seen" per stock alongside the auto-checkpoint.
- In-app "why this architecture" panel turning the decision log into a demo asset inside the product itself.

## Differentiation strategy
The idea alone won't differentiate — thousands of participants share the same AI tools and will converge on similar-sounding solutions. Differentiation comes from judgment made visible and defensible:
1. Surface evidence/reasoning as a UI feature ("why am I seeing this," real numbers), not hidden backend logic.
2. Demo the failure/staleness handling live during the presentation, not just claim it in the README.
3. Go deep on the volatility/volume engine rather than wide on features — test exact threshold boundaries, document the formula.
4. Ship a real decision log with rejected alternatives (this document), ready to defend under live questioning — fold its substance into the README trade-offs section for submission.

## Build order (72 hours)
1. Data model, provider adapter (real + mock), ingestion loop → `price_snapshots`
2. Change-detection engine built and unit-tested in isolation (threshold boundaries, insufficient-history case) before any UI
3. Backend API (contract above) + baseline-diffing logic
4. Frontend — watchlist view + "since you last checked" view + evidence panel
5. Edge cases from the list above, including the new ones
6. Deploy, seed demo data, write README with trade-off table, rehearse a live stale-data recovery demo

## Still open
Exact rolling-window size sensitivity (20 snapshots is a stated default, not yet stress-tested), exact demo script/timing, final product name.
