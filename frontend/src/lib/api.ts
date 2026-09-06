import type { ApiErrorBody, SystemStatus, WatchlistEntry, WatchlistResponse } from "./types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";
const TOKEN_KEY = "smw_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage can be unavailable (private browsing, quota) — the app still
    // works for the session, it just won't persist the watchlist identity
    // across a reload. Not fatal, so we swallow rather than crash the UI.
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
