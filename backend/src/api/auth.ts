import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { findUserByToken, createUser } from "../db/repository.js";

// No real authentication system — a generated token is enough. Explicitly
// cut from v1, see decision log. Token is issued once and the client is
// expected to persist and resend it (header `x-watchlist-token`).
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

    (req as any).userId = userId;
    (req as any).userToken = token;
    res.setHeader("x-watchlist-token", token!);
    next();
  } catch (err) {
    next(err);
  }
}
