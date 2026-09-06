import { AlertCircle, Inbox, RefreshCw, ShieldCheck } from "lucide-react";

export function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-surface-raised p-5">
          <div className="skeleton h-4 w-24 animate-shimmer rounded" />
          <div className="skeleton mt-3 h-3 w-16 animate-shimmer rounded" />
          <div className="skeleton mt-6 h-8 w-32 animate-shimmer rounded" />
          <div className="skeleton mt-4 h-8 w-full animate-shimmer rounded" />
        </div>
      ))}
    </div>
  );
}

export function EmptyWatchlistState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="rounded-full bg-surface-sunken p-3">
        <Inbox className="h-6 w-6 text-ink-faint" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink">Your watchlist is empty</h3>
      <p className="mt-1 max-w-xs text-sm text-ink-muted">
        Add a symbol above to start tracking it. We'll build up history in the background and flag what actually
        matters once we have enough to judge it against.
      </p>
    </div>
  );
}

export function NoSignificantChangesState() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-raised px-5 py-4">
      <div className="rounded-full bg-tier-normal/10 p-2">
        <ShieldCheck className="h-4 w-4 text-tier-normal" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">Nothing worth flagging since you last checked</p>
        <p className="text-xs text-ink-muted">Every tracked symbol is moving within its own normal range.</p>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-tier-high/20 bg-tier-high/5 py-14 text-center">
      <AlertCircle className="h-6 w-6 text-tier-high" />
      <h3 className="mt-3 text-sm font-semibold text-ink">Couldn't reach the server</h3>
      <p className="mt-1 max-w-xs text-sm text-ink-muted">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink hover:border-border-strong"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Try again
      </button>
    </div>
  );
}
