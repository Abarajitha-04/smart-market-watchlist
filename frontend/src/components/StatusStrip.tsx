import { Activity, ShieldAlert, ShieldCheck } from "lucide-react";
import { useHealth, useSystemStatus } from "@/hooks/useWatchlist";

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

/**
 * Deliberately visible reliability signal (see decision log): provider
 * health and last-ingestion time surfaced in the product itself, not just
 * asserted in the README.
 */
export function StatusStrip() {
  const health = useHealth();
  const status = useSystemStatus();

  const dbOk = health.data?.status === "ok";
  const usedFallback = status.data?.lastCallUsedFallback ?? false;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-border bg-surface-raised/60 px-4 py-2.5 text-xs text-ink-muted backdrop-blur">
      <span className="flex items-center gap-1.5">
        {dbOk ? (
          <ShieldCheck className="h-3.5 w-3.5 text-tier-normal" />
        ) : (
          <ShieldAlert className="h-3.5 w-3.5 text-tier-high" />
        )}
        Database {health.isLoading ? "checking…" : dbOk ? "connected" : "unreachable"}
      </span>
      <span className="flex items-center gap-1.5">
        <Activity className="h-3.5 w-3.5" />
        Provider: <span className="font-medium text-ink">{status.data?.lastProviderUsed ?? "—"}</span>
        {usedFallback && <span className="text-tier-moderate">(fallback active)</span>}
      </span>
      <span>Last ingestion: {timeAgo(status.data?.lastIngestionAt ?? null)}</span>
    </div>
  );
}
