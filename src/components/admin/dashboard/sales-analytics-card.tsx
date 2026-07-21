"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays } from "lucide-react";

type Point = {
  label: string;
  fullDate: string;
  sales: number;
  orders: number;
};

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

export function SalesAnalyticsCard({
  data,
  loading,
  asOfLabel,
  formatMoney,
}: {
  data: Point[];
  loading?: boolean;
  asOfLabel: string;
  formatMoney: (value: number) => string;
}) {
  const isMobile = useIsMobile();

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 lg:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight sm:text-lg">
            Sales analytics
          </h2>
          <p className="text-sm text-ink-soft">Revenue over the last 30 days</p>
        </div>
        <div className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-ink-soft">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{asOfLabel}</span>
        </div>
      </div>

      <div className="h-[220px] w-full min-w-0 sm:h-[280px]">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-xl bg-secondary" />
        ) : data.length === 0 ? (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-ink-soft">
            Sales activity will appear after customers start ordering.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 8,
                right: isMobile ? 4 : 8,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="merchantSalesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--ink-soft)", fontSize: isMobile ? 10 : 12 }}
                dy={8}
                minTickGap={isMobile ? 28 : 16}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={isMobile ? 36 : 52}
                tick={{ fill: "var(--ink-soft)", fontSize: isMobile ? 10 : 12 }}
                tickFormatter={(v) => {
                  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
                  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
                  return String(v);
                }}
              />
              <Tooltip
                cursor={{ stroke: "var(--primary)", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as Point;
                  return (
                    <div className="max-w-[220px] rounded-xl border border-border bg-card px-3 py-2 shadow-md">
                      <p className="text-sm font-semibold">{formatMoney(point.sales)}</p>
                      <p className="text-xs text-ink-soft">
                        {point.orders} orders · {point.fullDate}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#merchantSalesFill)"
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
