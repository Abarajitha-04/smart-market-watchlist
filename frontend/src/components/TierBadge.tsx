import { AlertTriangle, TrendingUp, Minus } from "lucide-react";
import type { Tier } from "@/lib/types";

const CONFIG: Record<Tier, { label: string; className: string; Icon: typeof Minus }> = {
  NORMAL: {
    label: "Normal",
    className: "bg-tier-normal/10 text-tier-normal border-tier-normal/25",
    Icon: Minus,
  },
  MODERATE: {
    label: "Moderate",
    className: "bg-tier-moderate/10 text-tier-moderate border-tier-moderate/30",
    Icon: TrendingUp,
  },
  HIGH: {
    label: "High",
    className: "bg-tier-high/10 text-tier-high border-tier-high/30",
    Icon: AlertTriangle,
  },
};

export function TierBadge({ tier, size = "md" }: { tier: Tier; size?: "sm" | "md" }) {
  const { label, className, Icon } = CONFIG[tier];
  const sizing = size === "sm" ? "text-[11px] px-2 py-0.5 gap-1" : "text-xs px-2.5 py-1 gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium leading-none ${sizing} ${className}`}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.5} />
      {label}
    </span>
  );
}
