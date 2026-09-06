interface MeterProps {
  label: string;
  value: number;
  moderateAt: number;
  highAt: number;
  format: (n: number) => string;
}

/**
 * Visualizes a raw metric against the exact thresholds the engine uses to
 * tier it — the point is that nothing here is invented for the UI; these
 * are the same Z_MODERATE/Z_HIGH/volume-ratio constants from
 * changeDetection.ts, made visible rather than buried in backend logic.
 */
export function EvidenceMeter({ label, value, moderateAt, highAt, format }: MeterProps) {
  const scaleMax = highAt * 1.4;
  const pct = Math.min(100, (Math.abs(value) / scaleMax) * 100);
  const moderatePct = (moderateAt / scaleMax) * 100;
  const highPct = (highAt / scaleMax) * 100;

  const barColor =
    Math.abs(value) >= highAt ? "bg-tier-high" : Math.abs(value) >= moderateAt ? "bg-tier-moderate" : "bg-accent";

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink-muted">{label}</span>
        <span className="font-mono text-sm font-semibold text-ink">{format(value)}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-px bg-border-strong" style={{ left: `${moderatePct}%` }} />
        <div className="absolute top-0 h-full w-px bg-border-strong" style={{ left: `${highPct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-faint">
        <span>0</span>
        <span style={{ marginLeft: `${moderatePct}%` }} className="-translate-x-1/2">
          moderate
        </span>
        <span style={{ marginLeft: `${highPct - moderatePct - 8}%` }}>high</span>
      </div>
    </div>
  );
}
