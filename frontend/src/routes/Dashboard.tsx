import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { AddSymbolForm } from "@/components/AddSymbolForm";
import { StatusStrip } from "@/components/StatusStrip";
import { AIDigestBanner } from "@/components/AIDigestBanner";
import { SymbolCard } from "@/components/SymbolCard";
import { EmptyWatchlistState, ErrorState, LoadingGrid, NoSignificantChangesState } from "@/components/States";
import type { Tier, WatchlistEntry } from "@/lib/types";
import { ApiError } from "@/lib/api";

const TIER_RANK: Record<Tier, number> = { HIGH: 0, MODERATE: 1, NORMAL: 2 };

function sortByRelevance(items: WatchlistEntry[]): WatchlistEntry[] {
  return [...items].sort((a, b) => TIER_RANK[a.evidence.tier] - TIER_RANK[b.evidence.tier]);
}

function Summary({ items }: { items: WatchlistEntry[] }) {
  const flagged = items.filter((i) => i.evidence.tier !== "NORMAL" && i.evidence.sufficientHistory);
  if (items.length === 0) return null;
  if (flagged.length === 0) return <NoSignificantChangesState />;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-tier-moderate/25 bg-tier-moderate/5 px-5 py-4">
      <div className="rounded-full bg-tier-moderate/15 p-2">
        <AlertTriangle className="h-4 w-4 text-tier-moderate" />
      </div>
      <p className="text-sm text-ink">
        <span className="font-semibold">
          {flagged.length} {flagged.length === 1 ? "symbol has" : "symbols have"}
        </span>{" "}
        moved outside its normal range since you last checked —{" "}
        <span className="font-medium">{flagged.map((f) => f.symbol).join(", ")}</span>.
      </p>
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading, isError, error, refetch } = useWatchlist();
  const sorted = useMemo(() => sortByRelevance(data?.items ?? []), [data]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Watchlist</h1>
        <p className="mt-1 text-sm text-ink-muted">
          What actually deserves your attention — measured against each stock's own recent behavior, not a flat
          threshold.
        </p>
      </div>

      <StatusStrip />

      <AddSymbolForm />

      {isLoading && <LoadingGrid />}

      {isError && (
        <ErrorState
          message={error instanceof ApiError && error.status === 0 ? "Is the backend running on localhost:4000?" : "Something went wrong loading your watchlist."}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && (
        <>
          <AIDigestBanner digest={data?.digest ?? null} />
          <Summary items={sorted} />

          {sorted.length === 0 ? (
            <EmptyWatchlistState />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sorted.map((entry, i) => (
                <SymbolCard key={entry.symbol} entry={entry} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
