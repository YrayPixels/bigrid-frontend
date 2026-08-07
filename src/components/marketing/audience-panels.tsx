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
import { Card, CardContent } from "@/components/ui/card";
import { EmptyPanelNote, PanelHeading, SERIES, formatCompact } from "@/components/marketing/viz-primitives";

/**
 * Grouped bars: two series that must be told apart, so the colour job is
 * categorical. Bars are thin with rounded data-ends and a gap between the
 * pair, and the legend is always present because there are two series.
 */
function AgeRangeChart({ buckets }: { buckets: AudienceAgeBucket[] }) {
  const peak = Math.max(...buckets.map((b) => Math.max(b.male, b.female)), 1);
  // Round the axis up to a clean step so gridlines land on readable numbers.
  const ceiling = Math.ceil(peak / 10) * 10 || 10;
  const gridlines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex w-9 shrink-0 flex-col-reverse justify-between py-1 text-right text-[10px] text-ink-soft">
          {gridlines.map((g) => (
            <span key={g}>{Math.round(ceiling * g)}%</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div aria-hidden className="absolute inset-0 flex flex-col-reverse justify-between">
            {gridlines.map((g) => (
              <div key={g} className="border-t border-border/50" />
            ))}
          </div>

          <div className="relative flex h-48 items-end justify-between gap-1">
            {buckets.map((bucket) => (
              <div key={bucket.bucket} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-full w-full items-end justify-center gap-[3px]">
                  {(["male", "female"] as const).map((gender) => (
                    <div
                      key={gender}
                      className="relative w-1/2 max-w-3 rounded-t-[4px] transition-opacity group-hover:opacity-100"
                      style={{
                        height: `${Math.max((bucket[gender] / ceiling) * 100, 1.5)}%`,
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

      <div className="flex items-center justify-center gap-4 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: SERIES.male }} />
          Male
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: SERIES.female }} />
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

/**
 * Ranked magnitude across categories — a bar chart in one hue, not a donut.
 * A donut of six close values is the classic misread; the ranked bar makes
 * the ordering obvious and lets the row label carry identity instead of colour.
 */
function CountryBars({ countries }: { countries: AudienceCountry[] }) {
  const peak = Math.max(...countries.map((c) => c.count), 1);

  return (
    <div className="space-y-2.5">
      {countries.map((country) => (
        <div key={country.code} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-ink">{country.name}</span>
            <span className="shrink-0 tabular-nums text-ink-soft">
              {formatCompact(country.count)}
              <span className="ml-1.5 text-xs">{country.share}%</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((country.count / peak) * 100, 2)}%`,
                background: SERIES.magnitude,
              }}
            />
          </div>
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
      className="h-8"
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
          <Card key={i}>
            <CardContent className="flex h-64 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hasAges = (audience?.age_gender.length ?? 0) > 0;
  const hasCountries = (audience?.countries.length ?? 0) > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-4 p-5">
          <PanelHeading
            title="Age range"
            hero={hasAges ? `${audience?.top_age_bucket} years` : undefined}
            caption={hasAges ? "Largest share of your followers" : undefined}
            action={
              hasAges ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <PanelHeading
            title="Top countries"
            hero={hasCountries ? audience?.top_country?.name : undefined}
            caption={
              hasCountries ? `${audience?.top_country?.share}% of your audience` : undefined
            }
            action={refreshButton}
          />
          {hasCountries ? (
            <CountryBars countries={audience!.countries} />
          ) : (
            <EmptyPanelNote>
              {audience?.suppressed_reason ?? "No audience data yet."}
            </EmptyPanelNote>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
