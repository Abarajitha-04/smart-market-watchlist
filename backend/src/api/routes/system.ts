import { Router } from "express";
import { pool } from "../../db/client.js";

export const systemRouter = Router();

let lastIngestionAt: string | null = null;
let lastProviderName: string | null = null;
let lastUsedFallback = false;

export function recordIngestion(providerName: string, usedFallback: boolean) {
  lastIngestionAt = new Date().toISOString();
  lastProviderName = providerName;
  lastUsedFallback = usedFallback;
}

systemRouter.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "degraded", db: "unreachable" });
  }
});

// Deliberately visible reliability signal — makes the "handling stale/
// failed data" story something a judge can see live, not just a claim.
systemRouter.get("/status", (_req, res) => {
  res.json({
    lastIngestionAt,
    lastProviderUsed: lastProviderName,
    lastCallUsedFallback: lastUsedFallback,
  });
});
