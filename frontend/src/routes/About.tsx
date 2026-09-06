import { SyncPanel } from "@/components/SyncPanel";

const PRINCIPLES = [
  {
    title: "The change-detection engine is pure and deterministic",
    body: "No I/O, no AI, nothing non-deterministic. Every tier assigned can be traced back to the exact numbers that produced it — a slow or wrong AI call can never corrupt whether something counts as meaningful.",
  },
  {
    title: "Meaningful means relative, not absolute",
    body: "A 3% move is routine for a volatile stock and extreme for a stable one. Both signals — price z-score and volume ratio — are computed against each stock's own rolling 20-snapshot history, never a flat threshold.",
  },
  {
    title: "Cold start never fabricates a tier",
    body: "Fewer than 20 snapshots and the UI shows raw numbers labeled \"insufficient history\" instead of a guess dressed up as a signal.",
  },
  {
    title: "AI sits after the decision, never inside it",
    body: "Narration is optional and fails open to the raw numbers on timeout or error — the product still works with zero AI involvement.",
  },
  {
    title: "\"Since you last checked\" is a real checkpoint, kept per device",
    body: "Stored per-account-per-device-per-symbol and updated on read, not a client-side illusion. Watchlist items are shared across every device on the same account, but each device tracks its own checkpoint — checking the watchlist on your phone never silently consumes what your laptop would otherwise flag. Link a second device with the sync code below.",
  },
];

const CUT = [
  "Real authentication (a generated token is enough for v1)",
  "Multi-asset classes beyond equities",
  "Per-user configurable thresholds",
  "Notifications and alerts",
  "News/sentiment signals",
  "Microservices — this is a monolith, on purpose",
];

export function About() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Why this architecture</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          The decision log behind this build, kept in the product itself rather than a README nobody opens during a
          demo. Every choice below was made under a 72-hour constraint and is defensible on its own terms.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="rounded-2xl border border-border bg-surface-raised p-5 shadow-card">
            <h2 className="text-sm font-semibold text-ink">{p.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{p.body}</p>
          </div>
        ))}
      </div>

      <SyncPanel />

      <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Explicitly cut from v1</h2>
        <p className="mt-1 text-sm text-ink-muted">Stated as conscious trade-offs, not hidden gaps.</p>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CUT.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-ink-muted">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
