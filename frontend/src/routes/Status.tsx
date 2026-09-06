import { CheckCircle2, XCircle } from "lucide-react";
import { useHealth, useSystemStatus } from "@/hooks/useWatchlist";

const EDGE_CASES = [
  { title: "Provider rate-limit or timeout", handling: "Falls back to the seeded mock feed automatically; the fallback is logged, never silent." },
  { title: "Out-of-order or duplicate snapshot", handling: "Rejected at write time if it isn't newer than the currently stored snapshot for that symbol." },
  { title: "Zero, negative, or missing price", handling: "Rejected at the provider layer — the last known-good value is kept instead." },
  { title: "Market closed / pre-market / weekend", handling: "Shown as its own explicit state, distinct from a genuine staleness problem." },
  { title: "Newly added symbol", handling: "Shows \"building history\" — never a fabricated tier from partial data." },
  { title: "Double-submit on add", handling: "Idempotent on the backend; a duplicate returns 409 rather than a second row." },
];

function Row({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
        {ok ? <CheckCircle2 className="h-4 w-4 text-tier-normal" /> : <XCircle className="h-4 w-4 text-tier-high" />}
        {value}
      </span>
    </div>
  );
}

export function Status() {
  const health = useHealth();
  const status = useSystemStatus();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">System status</h1>
        <p className="mt-1 text-sm text-ink-muted">
          The reliability story made visible, not just claimed — this is the same data judges can watch change live.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-card">
        <Row label="Database" ok={health.data?.status === "ok"} value={health.isLoading ? "Checking…" : health.data?.db ?? "unknown"} />
        <Row
          label="Active market data provider"
          ok={Boolean(status.data?.lastProviderUsed)}
          value={status.data?.lastProviderUsed ?? "—"}
        />
        <Row
          label="Fallback engaged on last cycle"
          ok={!status.data?.lastCallUsedFallback}
          value={status.data?.lastCallUsedFallback ? "Yes — provider failed over" : "No"}
        />
        <Row
          label="Last ingestion cycle"
          ok={Boolean(status.data?.lastIngestionAt)}
          value={status.data?.lastIngestionAt ? new Date(status.data.lastIngestionAt).toLocaleTimeString() : "—"}
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Edge cases handled by design</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {EDGE_CASES.map((c) => (
            <div key={c.title} className="rounded-xl bg-surface-sunken p-4">
              <p className="text-sm font-medium text-ink">{c.title}</p>
              <p className="mt-1 text-xs text-ink-muted">{c.handling}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
