/**
 * Client-side market-hours heuristic.
 *
 * Deliberate scope cut (see decision log — schema has no market-status
 * field): the backend never tells us whether an exchange is open. Rather
 * than silently mislabel a market-closed quote as "stale," we infer the
 * open/closed state from the symbol's exchange suffix and wall-clock time.
 * This is a heuristic, not a feed — it does not know about holidays or
 * special sessions, and that limitation is stated here and in the README
 * rather than hidden.
 */

interface ExchangeHours {
  timeZone: string;
  openMinute: number; // minutes from local midnight
  closeMinute: number;
  tradingDays: number[]; // 0=Sun..6=Sat
}

const EXCHANGES: Record<string, ExchangeHours> = {
  NSE: { timeZone: "Asia/Kolkata", openMinute: 9 * 60 + 15, closeMinute: 15 * 60 + 30, tradingDays: [1, 2, 3, 4, 5] },
  BSE: { timeZone: "Asia/Kolkata", openMinute: 9 * 60 + 15, closeMinute: 15 * 60 + 30, tradingDays: [1, 2, 3, 4, 5] },
  DEFAULT: { timeZone: "America/New_York", openMinute: 9 * 60 + 30, closeMinute: 16 * 60, tradingDays: [1, 2, 3, 4, 5] },
};

function minutesInZone(date: Date, timeZone: string): { minute: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return { minute: hour * 60 + minute, weekday: weekdayMap[weekdayStr] ?? 0 };
}

export function parseExchange(symbol: string): string {
  const [, exchange] = symbol.split(":");
  return exchange ?? "DEFAULT";
}

export function isMarketOpen(symbol: string, now: Date = new Date()): boolean {
  const hours = EXCHANGES[parseExchange(symbol)] ?? EXCHANGES.DEFAULT;
  const { minute, weekday } = minutesInZone(now, hours.timeZone);
  if (!hours.tradingDays.includes(weekday)) return false;
  return minute >= hours.openMinute && minute < hours.closeMinute;
}
