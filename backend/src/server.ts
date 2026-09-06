import "dotenv/config";
import express from "express";
import cors from "cors";
import { resolveUser } from "./api/auth.js";
import { watchlistRouter } from "./api/routes/watchlist.js";
import { systemRouter, recordIngestion } from "./api/routes/system.js";
import { ingestAllWatchedSymbols } from "./data/ingestion.js";
import { MockProvider } from "./data/providers/MockProvider.js";
import { TwelveDataProvider } from "./data/providers/TwelveDataProvider.js";
import type { MarketDataProvider } from "./data/types.js";

const app = express();
app.use(
  cors({
    // The client needs to read this custom header to persist its identity
    // token (no real auth in v1 — see decision log) — without exposing it
    // explicitly, the browser's fetch API silently hides it from JS even
    // though it's present on the wire, and the client would never persist
    // a token at all.
    exposedHeaders: ["x-watchlist-token", "x-watchlist-device"],
  })
);
app.use(express.json());

app.use("/", systemRouter);
app.use("/watchlist", resolveUser, watchlistRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "INTERNAL_ERROR" });
});

const PORT = Number(process.env.PORT ?? 4000);
const MODE = process.env.DATA_PROVIDER_MODE ?? "mock";

function buildProvider(): MarketDataProvider {
  if (MODE === "real" && process.env.TWELVE_DATA_API_KEY) {
    return new TwelveDataProvider(process.env.TWELVE_DATA_API_KEY);
  }
  // A demo-friendly mock with some injected staleness so the freshness
  // story is visible without needing to break the real provider live.
  return new MockProvider({ staleInjectionRate: 0.1 });
}

const provider = buildProvider();
const POLL_INTERVAL_MS = 20_000;

async function pollOnce() {
  try {
    const summary = await ingestAllWatchedSymbols(provider);
    recordIngestion(provider.name, summary.usedFallback);
  } catch (err) {
    console.error("Ingestion cycle failed", err);
  }
}

app.listen(PORT, () => {
  console.log(`Smart Market Watchlist backend listening on :${PORT} (provider: ${provider.name})`);
  pollOnce();
  setInterval(pollOnce, POLL_INTERVAL_MS);
});
