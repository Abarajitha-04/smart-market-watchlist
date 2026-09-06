import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEvidence, useWatchlist } from "@/hooks/useWatchlist";
import { TierBadge } from "@/components/TierBadge";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { Sparkline } from "@/components/Sparkline";
import { EvidenceMeter } from "@/components/EvidenceMeter";

export function SymbolDetail() {
  const { symbol = "" } = useParams<{ symbol: string }>();
  const watchlist = useWatchlist();
  const evidenceQuery = useEvidence(symbol);

  const entry = watchlist.data?.items.find((i) => i.symbol === symbol);
  const evidence = evidenceQuery.data ?? entry?.evidence;

  if (watchlist.isLoading || (evidenceQuery.isLoading && !evidence)) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading evidence…
      </div>
    );
  }

  if (!entry || !evidence) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
        <p className="text-sm text-ink-muted">
          {symbol} isn't on your watchlist (or was just removed). {" "}
          <Link to="/" className="font-medium text-accent">
            Back to watchlist
          </Link>
        </p>
      </div>
    );
  }

  const currency = symbol.includes(":NSE") || symbol.includes(":BSE") ? "INR" : "USD";
  const priceStr = entry.price != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(entry.price)
    : "—";

  return (
    <div className="flex flex-col gap-6">
      <Link to="/" className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to watchlist
      </Link>

      <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono text-xl font-bold tracking-tight text-ink">{entry.symbol}</h1>
              <TierBadge tier={evidence.tier} />
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <FreshnessBadge symbol={entry.symbol} isStale={entry.isStale} lastUpdated={entry.lastUpdated} />
              <DataSourceBadge source={entry.dataSource} />
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-3xl font-bold tabular-nums text-ink">{priceStr}</div>
            <div className="text-xs text-ink-muted">Volume: {entry.volume?.toLocaleString() ?? "—"}</div>
          </div>
        </div>

        <Sparkline prices={entry.recentPrices} className="mt-5 h-16 w-full" />
      </div>

      <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Why am I seeing this?</h2>
        <p className="mt-1 text-sm text-ink-muted">{evidence.reason}</p>

        {!evidence.sufficientHistory ? (
          <div className="mt-5 rounded-xl bg-surface-sunken p-4">
            <p className="text-sm text-ink">
              Building rolling history — {evidence.historyCount} of {evidence.windowSize} snapshots collected.
            </p>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${(evidence.historyCount / evidence.windowSize) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              No tier is assigned from partial data — we'd rather show raw numbers than guess.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <EvidenceMeter
              label="Price move vs. rolling volatility (z-score)"
              value={evidence.zScore ?? 0}
              moderateAt={1}
              highAt={2}
              format={(n) => `${n.toFixed(2)}σ`}
            />
            <EvidenceMeter
              label="Volume vs. rolling average"
              value={evidence.volumeRatio ?? 0}
              moderateAt={1.5}
              highAt={2.5}
              format={(n) => `${n.toFixed(2)}x`}
            />
          </div>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-faint">Price move</dt>
            <dd className="font-mono font-medium text-ink">
              {evidence.priceMove != null ? `${(evidence.priceMove * 100).toFixed(2)}%` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Rolling volatility</dt>
            <dd className="font-mono font-medium text-ink">
              {evidence.rollingVolatility != null ? `${(evidence.rollingVolatility * 100).toFixed(2)}%` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Rolling avg. volume</dt>
            <dd className="font-mono font-medium text-ink">{evidence.rollingAvgVolume?.toLocaleString() ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Window size</dt>
            <dd className="font-mono font-medium text-ink">{evidence.historyCount}/{evidence.windowSize}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
