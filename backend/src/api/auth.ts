import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { findUserByToken, createUser } from "../db/repository.js";

// No real authentication system — a generated token is enough. Explicitly
// cut from v1, see decision log. Token is issued once and the client is
// expected to persist and resend it (header `x-watchlist-token`).
//
// Separately, `x-watchlist-device` identifies THIS browser/device, not
// the account — it never gets looked up or created in the users table,
// it's just an opaque key the checkpoint logic scopes by (see
// device_baselines). The same token can be shared across multiple
// devices on purpose (that's how "sync this watchlist elsewhere" works —
// copy the token into another browser), while each device still keeps
// its own independent "since you last checked" state.
export async function resolveUser(req: Request, res: Response, next: NextFunction) {
  try {
    const headerToken = req.header("x-watchlist-token");
    let userId: string | null = null;
    let token = headerToken ?? null;

    if (token) {
      userId = await findUserByToken(token);
    }

    if (!userId) {
      token = token ?? randomUUID();
      userId = await createUser(token);
    }

    const headerDevice = req.header("x-watchlist-device");
    const deviceId = headerDevice && headerDevice.trim().length > 0 ? headerDevice.trim() : randomUUID();

    (req as any).userId = userId;
    (req as any).userToken = token;
    (req as any).deviceId = deviceId;
    res.setHeader("x-watchlist-token", token!);
    res.setHeader("x-watchlist-device", deviceId);
    next();
  } catch (err) {
    next(err);
  }
}
