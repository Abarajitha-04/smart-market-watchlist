import { FlaskConical, Radio } from "lucide-react";

/**
 * Surfaces which provider actually supplied the latest price, per symbol.
 * Exists because Twelve Data's free tier doesn't cover NSE/BSE at all
 * ("available starting with the Grow plan") — every Indian-exchange
 * symbol silently falls back to the seeded mock feed on this plan. Rather
 * than let a mock number sit indistinguishable from a real one, we say so.
 */
export function DataSourceBadge({ source }: { source: string | null }) {
  if (!source || source === "twelvedata") return null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-tier-moderate/30 bg-tier-moderate/10 px-2 py-0.5 text-[10px] font-medium text-tier-moderate"
      title="This symbol isn't covered by our current market-data plan, so this price is from the seeded mock feed, not a live market price."
    >
      <FlaskConical className="h-2.5 w-2.5" />
      Simulated data
    </span>
  );
}

export function LiveSourceBadge({ source }: { source: string | null }) {
  if (source !== "twelvedata") return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-faint">
      <Radio className="h-2.5 w-2.5" /> Live provider
    </span>
  );
}
