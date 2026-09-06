import type { ApiErrorBody, SystemStatus, WatchlistEntry, WatchlistResponse } from "./types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";
const TOKEN_KEY = "smw_token";
// Separate from the watchlist token on purpose: the token identifies the
// ACCOUNT (shared on purpose when you link a second device), the device id
// identifies THIS browser and is never meant to be copied anywhere. It
// scopes "since you last checked" so checking on your phone never silently
// consumes what your laptop would otherwise flag. See backend
// migrations/002_device_baselines.sql.
const DEVICE_KEY = "smw_device_id";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage can be unavailable (private browsing, quota) — the app still
    // works for the session, it just won't persist the watchlist identity
    // across a reload. Not fatal, so we swallow rather than crash the UI.
  }
}

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Extremely old browser fallback — still unique enough for a local,
    // non-security-sensitive scoping key.
    return `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    // No persistent storage available — generate a per-session id so the
    // app still works, it just won't remember "since last checked" across
    // a reload in this specific browsing context.
    return randomId();
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: ApiErrorBody | null
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("x-watchlist-token", token);
  headers.set("x-watchlist-device", getDeviceId());

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch (err) {
    // Network-level failure (backend down, CORS, offline) — surfaced as a
    // distinct kind of ApiError (status 0) so the UI can show a specific
    // "can't reach the server" state instead of a generic error.
    throw new ApiError("Network request failed", 0, null);
  }

  const echoedToken = res.headers.get("x-watchlist-token");
  if (echoedToken && echoedToken !== token) setToken(echoedToken);

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError((data as ApiErrorBody | null)?.error ?? res.statusText, res.status, data);
  }

  return data as T;
}

/**
 * Links this browser to a different watchlist account by adopting a token
 * copied from another device — the whole mechanism behind "sync this
 * watchlist elsewhere." This device's own id (and therefore its own
 * "since you last checked" state) never changes.
 */
export function linkToWatchlist(token: string) {
  setToken(token.trim());
}

export const api = {
  getWatchlist: () => request<WatchlistResponse>("/watchlist"),
  addSymbol: (symbol: string) =>
    request<{ symbol: string }>("/watchlist", { method: "POST", body: JSON.stringify({ symbol }) }),
  removeSymbol: (symbol: string) =>
    request<void>(`/watchlist/${encodeURIComponent(symbol)}`, { method: "DELETE" }),
  getEvidence: (symbol: string) =>
    request<WatchlistEntry["evidence"]>(`/watchlist/${encodeURIComponent(symbol)}/evidence`),
  getStatus: () => request<SystemStatus>("/status"),
  getHealth: () => request<{ status: string; db: string }>("/health"),
};
