"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chart colours for the marketing dashboard.
 *
 * These are not the project's `--chart-*` tokens on purpose: that ramp fails
 * the categorical checks (its two teals sit ΔE 10.6 apart in normal vision,
 * under the 15 floor), so series painted with it are hard to tell apart. The
 * pair below was validated for both light and dark surfaces, all-pairs, and
 * clears CVD separation, the normal-vision floor and 3:1 contrast in both.
 */
export const SERIES = {
  male: "var(--viz-male)",
  female: "var(--viz-female)",
  magnitude: "var(--viz-magnitude)",
} as const;

/** Scoped tokens; dark values are selected for the dark surface, not flipped. */
export function VizTokens() {
  return (
    <style>{`
      .viz-scope {
        --viz-male: #2a78d6;
        --viz-female: #d55181;
        --viz-magnitude: #2a78d6;
        --viz-track: color-mix(in oklab, currentColor 8%, transparent);
      }
      .dark .viz-scope {
        --viz-male: #3987e5;
        --viz-female: #d55181;
        --viz-magnitude: #3987e5;
      }
    `}</style>
  );
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Period-over-period change. A null delta means there was no previous period
 * to compare against — shown as "—" rather than an invented +100%.
 */
export function DeltaBadge({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  if (value === null || value === undefined) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-soft",
          className,
        )}
        title="No earlier period to compare against yet"
      >
        <Minus className="h-3 w-3" />
        <span className="sr-only">No comparison available</span>
      </span>
    );
  }

  const positive = value >= 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
        positive
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-rose-500/10 text-rose-700 dark:text-rose-400",
        className,
      )}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

/**
 * A headline number with its change. The form heuristic calls for a stat tile
 * rather than a one-bar chart when the data is a single current value.
 */
export function StatTile({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-canvas-raised p-4">
      <div className="text-xs font-medium text-ink-soft">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold text-ink">{value}</span>
        {delta !== undefined ? <DeltaBadge value={delta} /> : null}
      </div>
      {hint ? <div className="mt-0.5 text-xs text-ink-soft">{hint}</div> : null}
    </div>
  );
}

export function PanelHeading({
  title,
  hero,
  delta,
  caption,
  action,
}: {
  title: string;
  hero?: string;
  delta?: number | null;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {hero ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-3xl font-bold text-ink">{hero}</span>
          {delta !== undefined ? <DeltaBadge value={delta} /> : null}
          {caption ? <span className="text-sm text-ink-soft">{caption}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyPanelNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-ink-soft">
      {children}
    </div>
  );
}
