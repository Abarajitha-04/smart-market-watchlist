import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, X } from "lucide-react";
import type { WatchlistEntry } from "@/lib/types";
import { TierBadge } from "./TierBadge";
import { FreshnessBadge } from "./FreshnessBadge";
import { DataSourceBadge } from "./DataSourceBadge";
import { Sparkline } from "./Sparkline";
import { useRemoveSymbol } from "@/hooks/useWatchlist";

function formatPrice(price: number | null, symbol: string) {
  if (price == null) return "—";
  const currency = symbol.includes(":NSE") || symbol.includes(":BSE") ? "INR" : "USD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(price);
}

function formatMove(move: number | null) {
  if (move == null) return null;
  const pct = (move * 100).toFixed(2);
  return `${move >= 0 ? "+" : ""}${pct}%`;
}

export function SymbolCard({ entry, index }: { entry: WatchlistEntry; index: number }) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const removeSymbol = useRemoveSymbol();
  const move = formatMove(entry.evidence.priceMove);
  const moveIsUp = (entry.evidence.priceMove ?? 0) >= 0;

  return (
    <div
      className="group animate-slide-up rounded-2xl border border-border bg-surface-raised p-5 shadow-card transition-colors hover:border-border-strong"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-mono text-sm font-semibold tracking-tight text-ink">{entry.symbol}</h3>
            <TierBadge tier={entry.evidence.tier} size="sm" />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <FreshnessBadge symbol={entry.symbol} isStale={entry.isStale} lastUpdated={entry.lastUpdated} />
            <DataSourceBadge source={entry.dataSource} />
          </div>
        </div>

        {confirmingRemove ? (
          <div className="flex shrink-0 items-center gap-1 text-xs">
            <button
              onClick={() => removeSymbol.mutate(entry.symbol)}
              disabled={removeSymbol.isPending}
              className="rounded-lg bg-tier-high/10 px-2 py-1 font-medium text-tier-high hover:bg-tier-high/20"
            >
              {removeSymbol.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Remove"}
            </button>
            <button
              onClick={() => setConfirmingRemove(false)}
              className="rounded-lg px-2 py-1 font-medium text-ink-muted hover:bg-surface-sunken"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingRemove(true)}
            aria-label={`Remove ${entry.symbol} from watchlist`}
            className="shrink-0 rounded-lg p-1.5 text-ink-faint opacity-0 transition-opacity hover:bg-surface-sunken hover:text-tier-high group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="font-mono text-2xl font-bold tabular-nums text-ink">{formatPrice(entry.price, entry.symbol)}</div>
          {move && (
            <div className={`mt-0.5 text-xs font-medium tabular-nums ${moveIsUp ? "text-tier-normal" : "text-tier-high"}`}>
              {move} since you last checked
            </div>
          )}
        </div>
        <Sparkline prices={entry.recentPrices} className="h-8 w-24" />
      </div>

      {!entry.evidence.sufficientHistory && (
        <div className="mt-3 rounded-lg bg-surface-sunken px-3 py-2 text-[11px] text-ink-muted">
          Building history — {entry.evidence.historyCount}/{entry.evidence.windowSize} snapshots collected.
        </div>
      )}

      <Link
        to={`/symbol/${encodeURIComponent(entry.symbol)}`}
        className="mt-4 flex items-center justify-between rounded-lg px-1 py-1 text-xs font-medium text-ink-muted transition-colors hover:text-accent"
      >
        Why am I seeing this?
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
