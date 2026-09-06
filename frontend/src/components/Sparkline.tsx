export function Sparkline({ prices, className = "" }: { prices: number[]; className?: string }) {
  if (prices.length < 2) {
    return <div className={`flex items-center text-[11px] text-ink-faint ${className}`}>Not enough history yet</div>;
  }

  const width = 120;
  const height = 32;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return [x, y] as const;
  });

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const trendingUp = prices[prices.length - 1] >= prices[0];
  const strokeColor = trendingUp ? "rgb(var(--tier-normal))" : "rgb(var(--tier-high))";

  const areaPath = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none" aria-hidden="true">
      <path d={areaPath} fill={strokeColor} fillOpacity={0.08} stroke="none" />
      <path d={path} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
