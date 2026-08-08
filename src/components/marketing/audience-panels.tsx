"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCcw, Table2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useMarketingAudience } from "@/hooks/use-merchant-queries";
import { merchantKeys } from "@/lib/query-keys";
import type { AudienceAgeBucket, AudienceCountry } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import {
  COUNTRY_RING,
  DeltaBadge,
  EmptyPanelNote,
  PanelHeading,
  SERIES,
  formatCompact,
  kpiSurfaceClassName,
} from "@/components/marketing/viz-primitives";

/**
 * Capsule bars (fully rounded) — matches the KPI reference Age Range card.
 */
function AgeRangeChart({ buckets }: { buckets: AudienceAgeBucket[] }) {
  const peak = Math.max(...buckets.map((b) => Math.max(b.male, b.female)), 1);
  const ceiling = Math.ceil(peak / 10) * 10 || 10;
  const gridlines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex w-9 shrink-0 flex-col-reverse justify-between py-1 text-right text-[10px] text-ink-soft">
          {gridlines.map((g) => (
            <span key={g}>{Math.round(ceiling * g)}%</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div aria-hidden className="absolute inset-0 flex flex-col-reverse justify-between">
            {gridlines.map((g) => (
              <div key={g} className="border-t border-dashed border-border/60" />
            ))}
          </div>

          <div className="relative flex h-52 items-end justify-between gap-1.5 px-1">
            {buckets.map((bucket) => (
              <div key={bucket.bucket} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  {(["male", "female"] as const).map((gender) => (
                    <div
                      key={gender}
                      className="relative w-[42%] max-w-[14px] rounded-full transition-opacity"
                      style={{
                        height: `${Math.max((bucket[gender] / ceiling) * 100, 4)}%`,
                        background: gender === "male" ? SERIES.male : SERIES.female,
                      }}
                    >
                      <span className="sr-only">
                        {gender} {bucket.bucket}: {bucket[gender]}%
                      </span>
                    </div>
                  ))}
                </div>
                <span className="truncate text-[10px] text-ink-soft">{bucket.bucket}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-5 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES.male }} />
          Male
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES.female }} />
          Female
        </span>
      </div>
    </div>
  );
}

function AgeTable({ buckets }: { buckets: AudienceAgeBucket[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-ink-soft">
            <th className="py-2 font-medium">Age</th>
            <th className="py-2 text-right font-medium">Male</th>
            <th className="py-2 text-right font-medium">Female</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.bucket} className="border-b border-border/50 last:border-0">
              <td className="py-2 text-ink">{bucket.bucket}</td>
              <td className="py-2 text-right text-ink-soft">{bucket.male}%</td>
              <td className="py-2 text-right text-ink-soft">{bucket.female}%</td>
              <td className="py-2 text-right font-medium text-ink">{bucket.total}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CountryRings({ countries }: { countries: AudienceCountry[] }) {
  const top = countries.slice(0, 6);
  const size = 168;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-40 w-40 shrink-0" aria-hidden>
      {top.map((country, index) => {
        const radius = 72 - index * 10;
        const stroke = 7;
        const circumference = 2 * Math.PI * radius;
        const frac = Math.max(Math.min(country.share / 100, 1), 0.04);
        const dash = circumference * frac;

        return (
          <circle
            key={country.code}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={COUNTRY_RING[index % COUNTRY_RING.length]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(-90 ${cx} ${cy})`}
            opacity={0.95 - index * 0.04}
          />
        );
      })}
    </svg>
  );
}

function CountryList({ countries }: { countries: AudienceCountry[] }) {
  return (
    <div className="min-w-0 flex-1 space-y-2.5">
      {countries.slice(0, 6).map((country, index) => (
        <div key={country.code} className="flex items-center justify-between gap-2 text-sm">
          <span className="inline-flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: COUNTRY_RING[index % COUNTRY_RING.length] }}
            />
            <span className="truncate text-ink">{country.name}</span>
          </span>
          <span className="shrink-0 tabular-nums text-ink-soft">
            {formatCompact(country.count)}
            <span className="ml-2 text-xs">{country.share}%</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function AudiencePanels() {
  const queryClient = useQueryClient();
  const audienceQuery = useMarketingAudience();
  const [showTable, setShowTable] = useState(false);

  const refresh = useMutation({
    mutationFn: () => api.refreshMarketingAudience(),
    onSuccess: (data) => {
      toast.success(data.message);
      void queryClient.invalidateQueries({ queryKey: merchantKeys.marketing.audience() });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const audience = audienceQuery.data;
  const refreshButton = (
    <Button
      size="sm"
      variant="outline"
      onClick={() => refresh.mutate()}
      disabled={refresh.isPending}
      className="h-8 rounded-full"
    >
      {refresh.isPending ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
      )}
      Refresh
    </Button>
  );

  if (audienceQuery.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={kpiSurfaceClassName("flex h-72 items-center justify-center")}>
            <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
          </div>
        ))}
      </div>
    );
  }

  const hasAges = (audience?.age_gender.length ?? 0) > 0;
  const hasCountries = (audience?.countries.length ?? 0) > 0;
  const topTwo = (audience?.countries ?? []).slice(0, 2);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={kpiSurfaceClassName("space-y-5 p-5")}>
        <PanelHeading
          title="Age range"
          hero={hasAges ? `${audience?.top_age_bucket} years` : undefined}
          caption={hasAges ? "Compared last sync" : undefined}
          action={
            hasAges ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full"
                onClick={() => setShowTable((open) => !open)}
              >
                <Table2 className="mr-1.5 h-3.5 w-3.5" />
                {showTable ? "Chart" : "Table"}
              </Button>
            ) : (
              refreshButton
            )
          }
        />
        {hasAges ? (
          showTable ? (
            <AgeTable buckets={audience!.age_gender} />
          ) : (
            <AgeRangeChart buckets={audience!.age_gender} />
          )
        ) : (
          <EmptyPanelNote>
            {audience?.suppressed_reason ?? "No audience data yet."}
          </EmptyPanelNote>
        )}
      </div>

      <div className={kpiSurfaceClassName("space-y-5 p-5")}>
        <PanelHeading
          title="Top country"
          hero={
            hasCountries && audience?.top_country
              ? `${audience.top_country.share}% Avg`
              : undefined
          }
          caption={hasCountries ? audience?.top_country?.name : undefined}
          action={refreshButton}
        />
        {hasCountries ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-5">
              <CountryRings countries={audience!.countries} />
              <CountryList countries={audience!.countries} />
            </div>
            {topTwo.length > 0 ? (
              <div className="border-t border-border/60 pt-4">
                <p className="mb-2 text-xs font-medium text-ink-soft">Top share</p>
                <div className="flex flex-wrap gap-4">
                  {topTwo.map((country, index) => (
                    <div key={country.code} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: COUNTRY_RING[index % COUNTRY_RING.length] }}
                      />
                      <span className="text-ink">{country.name}</span>
                      <span className="tabular-nums text-ink-soft">{country.share}%</span>
                      <DeltaBadge value={null} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyPanelNote>
            {audience?.suppressed_reason ?? "No audience data yet."}
          </EmptyPanelNote>
        )}
      </div>
    </div>
  );
}
