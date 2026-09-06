import { Clock, Moon, WifiOff } from "lucide-react";
import { isMarketOpen } from "@/lib/marketHours";

/**
 * Distinguishes "market closed" from "data is stale" — an explicit edge
 * case from the decision log. A non-updating quote outside trading hours
 * is expected behavior, not a reliability problem, and conflating the two
 * would misrepresent the system's actual health during a demo.
 */
export function FreshnessBadge({ symbol, isStale, lastUpdated }: { symbol: string; isStale: boolean; lastUpdated: string | null }) {
  if (!lastUpdated) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint">
        <Clock className="h-3 w-3" /> No data yet
      </span>
    );
  }

  const marketOpen = isMarketOpen(symbol);

  if (!marketOpen) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint" title="Market is outside trading hours — the price isn't expected to update right now.">
        <Moon className="h-3 w-3" /> Market closed
      </span>
    );
  }

  if (isStale) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-tier-moderate" title="No fresh update in over 2 minutes while the market is open.">
        <WifiOff className="h-3 w-3" /> Stale data
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint">
      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> Live
    </span>
  );
}
