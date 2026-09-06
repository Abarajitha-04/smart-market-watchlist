import { useState, type FormEvent } from "react";
import { Check, Copy, Smartphone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getToken, linkToWatchlist } from "@/lib/api";

/**
 * The actual mechanism behind multi-device sync: the watchlist token is a
 * shareable "sync code" for the ACCOUNT (same items everywhere it's
 * entered), while each browser keeps its own device id and therefore its
 * own independent "since you last checked" state — see
 * backend/migrations/002_device_baselines.sql. Pasting the same code into
 * a second device links the same watchlist there without merging their
 * checkpoints.
 */
export function SyncPanel() {
  const [pasted, setPasted] = useState("");
  const [copied, setCopied] = useState(false);
  const [linked, setLinked] = useState(false);
  const queryClient = useQueryClient();
  const currentToken = getToken();

  async function handleCopy() {
    if (!currentToken) return;
    try {
      await navigator.clipboard.writeText(currentToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked (permissions, insecure context) — the
      // code is still selectable text, so this isn't fatal to the feature.
    }
  }

  function handleLink(e: FormEvent) {
    e.preventDefault();
    const code = pasted.trim();
    if (!code) return;
    linkToWatchlist(code);
    setLinked(true);
    queryClient.invalidateQueries();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-ink-muted" />
        <h2 className="text-sm font-semibold text-ink">Sync across devices</h2>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        Your watchlist items are tied to a sync code, not this browser. Copy it into another device to see the same
        watchlist there — each device still tracks "since you last checked" independently, so checking on your phone
        never resets what your laptop would flag.
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-8">
        <div className="flex-1">
          <label className="text-xs font-medium uppercase tracking-wide text-ink-faint">This device's sync code</label>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 truncate rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs text-ink-muted">
              {currentToken ?? "generated on first load"}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!currentToken}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface disabled:opacity-40"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <form onSubmit={handleLink} className="flex-1">
          <label className="text-xs font-medium uppercase tracking-wide text-ink-faint">Link a code from elsewhere</label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              value={pasted}
              onChange={(e) => {
                setPasted(e.target.value);
                setLinked(false);
              }}
              placeholder="Paste a sync code"
              className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs text-ink placeholder:font-sans placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="submit"
              disabled={!pasted.trim()}
              className="shrink-0 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Link
            </button>
          </div>
          {linked && <p className="mt-1.5 text-xs text-ink-muted">Linked — this device now shows that watchlist.</p>}
        </form>
      </div>
    </div>
  );
}
