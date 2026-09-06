import { Sparkles } from "lucide-react";

/**
 * The optional AI narration layer from the decision log — additive only.
 * It never decides what's meaningful (the deterministic engine already
 * did that before this component ever sees anything); it only restates
 * the engine's own output in a sentence. Rendered above the deterministic
 * summary, never instead of it, so the traceable numbers are always still
 * visible directly underneath.
 */
export function AIDigestBanner({ digest }: { digest: string | null }) {
  if (!digest) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-accent/25 bg-accent/5 px-5 py-3.5">
      <div className="rounded-full bg-accent/15 p-1.5">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
      </div>
      <p className="text-sm text-ink">{digest}</p>
      <span className="ml-auto shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-medium text-ink-faint">
        AI summary
      </span>
    </div>
  );
}
