import { Router } from "express";
import { z } from "zod";
import { addWatchlistItem, removeWatchlistItem } from "../../db/repository.js";
import { getWatchlistWithChanges, getSymbolEvidence } from "../../services/watchlistService.js";
import { generateDigest } from "../../services/narration.js";

export const watchlistRouter = Router();

// Plain symbols ("AAPL") default to US exchanges. Non-US equities use
// "SYMBOL:EXCHANGE" (e.g. "RELIANCE:NSE", "TCS:BSE") — see TwelveDataProvider.
const addSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .regex(/^[A-Za-z0-9.\-]+(:[A-Za-z0-9.\-]+)?$/, "Symbol contains invalid characters")
    .transform((s) => s.toUpperCase()),
});

watchlistRouter.post("/", async (req, res, next) => {
  try {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_SYMBOL", details: parsed.error.flatten() });
    }
    const userId = (req as any).userId as string;
    const outcome = await addWatchlistItem(userId, parsed.data.symbol);
    if (outcome === "duplicate") {
      return res.status(409).json({ error: "ALREADY_WATCHING", symbol: parsed.data.symbol });
    }
    res.status(201).json({ symbol: parsed.data.symbol });
  } catch (err) {
    next(err);
  }
});

watchlistRouter.delete("/:symbol", async (req, res, next) => {
  try {
    const userId = (req as any).userId as string;
    const symbol = req.params.symbol.toUpperCase();
    await removeWatchlistItem(userId, symbol);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

watchlistRouter.get("/", async (req, res, next) => {
  try {
    const userId = (req as any).userId as string;
    const entries = await getWatchlistWithChanges(userId);

    // AI narration is additive and best-effort — a failure here must never
    // fail the whole request. generateDigest already fails open to null,
    // but this catch is a second, defensive layer against surprises.
    let digest: string | null = null;
    try {
      digest = await generateDigest(entries);
    } catch (err) {
      console.warn("[watchlist] digest generation threw unexpectedly:", err);
    }

    res.json({ items: entries, digest });
  } catch (err) {
    next(err);
  }
});

watchlistRouter.get("/:symbol/evidence", async (req, res, next) => {
  try {
    const userId = (req as any).userId as string;
    const symbol = req.params.symbol.toUpperCase();
    const evidence = await getSymbolEvidence(userId, symbol);
    res.json(evidence);
  } catch (err) {
    next(err);
  }
});
