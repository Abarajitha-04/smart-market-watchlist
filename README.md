# Smart Market Watchlist

**Code, by Groww 2026 — solo, 72-hour build**

> "Don't make me re-scan my whole watchlist — tell me what actually deserves my attention since I last looked."

A watchlist that doesn't just show prices — it tells you which of your stocks moved in a way that's actually unusual *for that stock*, versus normal day-to-day noise. No flat "±3% = alert" threshold. Every signal is computed relative to each symbol's own recent volatility and volume, so a jumpy small-cap and a sleepy blue-chip are never held to the same bar.

**Live demo:** _[backend URL] · [frontend URL]_ — fill in after deploy

---

## The actual differentiator

Anyone can compute `% change` and flag anything over a threshold. That's not a signal, it's noise with extra steps — a stock that normally swings 4% a day isn't "alarming" at 4%, and a stock that never moves 0.5% absolutely is.

This app computes two things per symbol, both relative to its own trailing 20-snapshot window:

- **Price anomaly (z-score):** current % move ÷ rolling standard deviation of that symbol's own recent % returns
- **Volume anomaly (ratio):** current volume ÷ that symbol's own rolling average volume

Tiered deterministically:

| Tier | Rule |
|---|---|
| **HIGH** | \|z-score\| ≥ 2, or (\|z-score\| ≥ 1 and volume ratio ≥ 2.5) |
| **MODERATE** | \|z-score\| ≥ 1, or volume ratio ≥ 1.5 |
| **NORMAL** | otherwise |
| **Insufficient history** | fewer than 20 snapshots — shown honestly as raw numbers, never a fabricated tier |

The engine that computes this is pure, deterministic, and has zero I/O and zero AI in it — nothing (including a slow or wrong AI call) can ever corrupt whether something counts as a meaningful change. Every tier the UI shows can be reproduced by hand from the numbers on the "why am I seeing this" page.

## What "since you last checked" means

A checkpoint (`device_baselines`) is stored per account **and per device** per symbol, and updated the moment the watchlist is read on that device. The dashboard diffs the current state against that checkpoint, not against some fixed time window — so two people (or two devices for the same person) watching the same stock can each see a different "what's new" based on when they personally last looked.

Watchlist *items* are still shared across every device on the same account, via a shareable sync code (the same token the app already issues) — copy it from **Architecture → Sync across devices** into a second browser to see the same watchlist there. What's per-device is only the checkpoint: opening the watchlist on your phone never silently resets what your laptop would otherwise flag. See `backend/migrations/002_device_baselines.sql` for the exact mechanism and why it replaced the original single-checkpoint design.

## Architecture

Monolith, on purpose — not microservices. A 72-hour solo build has one thing to protect: the correctness of the change-detection engine. Splitting that into services buys nothing and adds real failure surface (network calls, serialization, partial deploys) between components that all fit in one process.

```
┌─────────────┐     poll every 20s      ┌──────────────────┐
│ Twelve Data │ ───────────────────────▶│  Ingestion loop   │
│ (or mock    │  rate-limited,          │  (fair rotation   │
│  fallback)  │  fails open to mock     │   across symbols) │
└────────────┘                         └────────┬──────────┘
                                                  │ append-only
                                                  ▼
                                         ┌──────────────────┐
                                         │  price_snapshots  │  (Postgres)
                                         └────────┬──────────┘
                                                  │
                                                  ▼
                                    ┌──────────────────────────┐
                                    │ Change-detection engine   │
                                    │ (pure, deterministic,     │
                                    │  zero I/O, unit-tested)   │
                                    └────────────┬──────────────┘
                                                 │
                                    ┌────────────▼──────────────┐
                                    │ Optional AI narration      │
                                    │ (Groq) — restates the      │
                                    │ engine's own output only,  │
                                    │ never decides anything,    │
                                    │ fails open to null on any  │
                                    │ error/timeout/missing key  │
                                    └────────────┬──────────────┘
                                                 │
                                         ┌────────▼────────┐
                                         │  REST API        │
                                         │  (Express)       │
                                         └────────┬─────────┘
                                                  │
                                         ┌────────▼─────────┐
                                         │  React frontend   │
                                         │  (polls every 20s)│
                                         └───────────────────┘
```

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + TypeScript | Fast iteration for a 72h build |
| Data fetching | TanStack Query | Its stale-time/refetch/cache model is a near-exact match for "poll, and show me what's new" — didn't need to hand-roll it |
| Styling | Tailwind CSS, CSS-variable theming | Fast, and light/dark theming without a component library dependency |
| Backend | Node + Express + TypeScript | zod for one shared runtime-validation layer across the API boundary |
| Database | PostgreSQL (Neon, serverless) | Append-only `price_snapshots` is the actual source of truth; no ORM — raw `pg` after Prisma added more ceremony than value for 4 tables |
| Market data | Twelve Data (free tier) | Real quotes for US equities; NSE/BSE and a seeded mock fallback cover what the free tier doesn't (see Trade-offs) |
| AI (optional) | Groq (`llama-3.1-8b-instant`) | Narration-only, fails open — see Architecture |
| Auth | Header token, no passwords | Explicitly cut from v1 — see Trade-offs |
| Deployment | Render/Railway (backend + Postgres) + Vercel (frontend) | Free tiers, zero-downtime redeploy on push |

## Running locally

**Requirements:** Node 20+, a Postgres database (Neon's free tier works), optionally a Twelve Data API key and a Groq API key.

```bash
git clone https://github.com/Abarajitha-04/smart-market-watchlist.git
cd smart-market-watchlist

# Backend
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL at minimum
psql "$DATABASE_URL" -f migrations/001_init.sql
npm run dev             # listens on :4000

# Frontend (separate terminal)
cd ../frontend
npm install
cp .env.example .env    # VITE_API_BASE_URL=http://localhost:4000
npm run dev              # served on :5173
```

Without `TWELVE_DATA_API_KEY` (or with `DATA_PROVIDER_MODE` unset/not `"real"`), the backend runs entirely on the seeded mock feed — the full app, including the change-detection engine and the UI, works with zero external dependencies beyond Postgres.

### Environment variables

**Backend (`backend/.env`):**

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `PORT` | No | Default `4000` |
| `DATA_PROVIDER_MODE` | No | `"real"` to use Twelve Data; anything else (or unset) uses the mock feed |
| `TWELVE_DATA_API_KEY` | Only if `DATA_PROVIDER_MODE=real` | Free tier: US equities/forex/crypto only, 8 credits/min, 800 credits/day |
| `TWELVE_DATA_MAX_PER_MINUTE` | No | Default `7` (one credit of headroom under the free tier's 8/min cap) |
| `GROQ_API_KEY` | No | Enables the optional AI digest banner; app behaves identically without it |

**Frontend (`frontend/.env`):**

| Variable | Required |
|---|---|
| `VITE_API_BASE_URL` | Yes — the backend's base URL |

## Tests

```bash
cd backend
npm test
```

Covers the change-detection engine's threshold boundaries and insufficient-history case, and the sliding-window rate limiter's burst/expiry behavior — the two places where a subtle off-by-one would be invisible in normal use but wrong under the hood.

## Trade-offs (the honest version)

Every one of these was a conscious call under a 72-hour solo constraint, not an oversight — happy to defend any of them live. (Multi-device checkpoint sync was originally scoped as a cut too — it moved off this list once there was real time margin, on the reasoning that it deepens the actual thesis rather than adding infrastructure alongside it; see "since you last checked" above.)

| Cut / simplified | Why | What it would take to fix |
|---|---|---|
| No Redis cache | Decision log originally scoped it for "compute once per instrument, serve to all watchers"; at solo-project scale (one user, ≤10 symbols) the per-instrument dedup in the ingestion loop already gives that property without adding an operational dependency | Add Redis as a shared compute-once layer once concurrent user count actually justifies it |
| Token-only auth, no passwords | A generated header token is enough to demonstrate per-user state; real auth is orthogonal to the actual differentiator (the change-detection engine) | Swap in a real auth provider; the `resolveUser` middleware is the single seam to replace |
| Polling, not WebSockets | 15–20s polling is indistinguishable from push at this data cadence (quotes don't update faster than that anyway on the free tier), and it avoids a stateful connection layer | Swap TanStack Query's polling for a WebSocket subscription if a paid, faster-cadence provider is added |
| In-memory rate limiter & rotation offset | Correct for a single backend instance (the actual deployment target here); would under- or over-count against a shared budget if horizontally scaled | Move the sliding window into Redis/Postgres if scaled beyond one instance |
| Twelve Data free tier: no NSE/BSE | Confirmed via direct API test (`404`, "available starting with the Grow or Venture plan") — not a bug, a plan limit. `RELIANCE:NSE` is included in the demo watchlist specifically to make this limitation visible and honest, not hidden | Upgrade the Twelve Data plan, or add a second provider for Indian exchanges |
| Twelve Data free tier: 800 credits/day | Shared across all testing that day; exhausted mid-development more than once during this build. The client-side sliding-window limiter prevents wasting requests once known-exhausted, but can't create budget that doesn't exist | Paid tier, or a second provider as backup |
| No news/sentiment signal | Explicitly out of scope for v1 — the engine's job is proving out the volatility/volume signal cleanly before adding a second, noisier signal on top | Add as an independent, clearly-labeled second signal — never blended into the deterministic tier |

## Live reliability story (visible, not just claimed)

The `/status` endpoint and the in-app status strip report the *real* outcome of the last ingestion cycle — which provider ran, whether any symbol fell back to the mock feed that cycle, and when. This isn't a hardcoded "healthy" flag: `usedFallback` is computed from what each symbol's fetch actually did that cycle, symbol-by-symbol, and surfaced in the UI as a per-symbol "Simulated data" badge — so a judge (or you, live) can watch a real provider failure degrade gracefully instead of being told it would.

## Decision log

The full working decision log — including rejected alternatives — lives in `docs/decision-log.md` and is also surfaced in-app under **Architecture**.
