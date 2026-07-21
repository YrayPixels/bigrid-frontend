"use client";

import Link from "next/link";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardMetricCard({
  title,
  value,
  icon,
  iconClassName,
  trend,
  footer,
  href,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconClassName?: string;
  trend?: { value: number; isPositive: boolean } | null;
  footer?: string;
  href?: string;
  loading?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/70 bg-secondary/60 text-primary sm:h-11 sm:w-11",
            iconClassName,
          )}
        >
          {icon}
        </div>
        {href ? (
          <span className="rounded-full p-1.5 text-ink-soft transition-colors group-hover:bg-secondary group-hover:text-ink">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      <div className="mt-4 min-w-0 space-y-1 sm:mt-5">
        <p className="text-sm text-ink-soft">{title}</p>
        {loading ? (
          <div className="h-7 w-24 animate-pulse rounded-md bg-secondary sm:h-8 sm:w-28" />
        ) : (
          <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1">
            <p className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {value}
            </p>
            {trend && Number.isFinite(trend.value) ? (
              <span
                className={cn(
                  "mb-0.5 inline-flex items-center gap-0.5 text-xs font-medium",
                  trend.isPositive ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {Math.abs(trend.value).toFixed(2)}%
              </span>
            ) : null}
          </div>
        )}
      </div>

      {(footer || href) && (
        <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-ink-soft sm:mt-4">
          {loading ? (
            <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
          ) : (
            <span className="min-w-0 truncate">{footer}</span>
          )}
          {href ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60" /> : null}
        </div>
      )}
    </>
  );

  const classes =
    "group min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-300 sm:p-5 sm:hover:-translate-y-0.5 sm:hover:shadow-md";

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
