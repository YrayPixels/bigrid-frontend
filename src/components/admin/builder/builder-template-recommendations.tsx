"use client";

import { Loader2 } from "lucide-react";
import { TemplateMiniPreview } from "@/components/admin/builder/template-mini-preview";
import type {
  StorefrontTemplateId,
  StorefrontTemplateOption,
  StorefrontTemplateRecommendation,
} from "@/lib/api/types";

type ConcreteTemplateOption = StorefrontTemplateOption & { value: StorefrontTemplateId };

export function BuilderTemplateRecommendations({
  brandColor,
  recommendations,
  templateOptions,
  selectedTemplateId,
  title = "Pick a website design",
  subtitle,
  loading,
  disabled,
  onSelect,
}: {
  brandColor: string;
  recommendations: StorefrontTemplateRecommendation[];
  templateOptions: ConcreteTemplateOption[];
  selectedTemplateId: StorefrontTemplateId | null;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  disabled?: boolean;
  onSelect: (templateId: StorefrontTemplateId) => void;
}) {
  const recommendationByTemplate = new Map(
    recommendations.map((recommendation) => [recommendation.template_id, recommendation]),
  );

  const recommendedOptions = recommendations.length
    ? recommendations
        .map((recommendation) =>
          templateOptions.find((option) => option.value === recommendation.template_id),
        )
        .filter((option): option is ConcreteTemplateOption => Boolean(option))
    : templateOptions;

  const remainingOptions = templateOptions.filter(
    (option) => !recommendationByTemplate.has(option.value),
  );

  const options = [...recommendedOptions, ...remainingOptions];

  if (!options.length) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{title}</p>
        {subtitle ? <p className="mt-1 text-xs leading-5 text-ink-soft">{subtitle}</p> : null}
      </div>
      {loading ? (
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-ink-soft">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Ranking templates...
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const active = selectedTemplateId === option.value;
          const recommendation = recommendationByTemplate.get(option.value);
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(option.value)}
              className={`rounded-xl border p-3 text-left transition disabled:opacity-60 ${
                active
                  ? "border-primary bg-primary/5 text-ink shadow-soft"
                  : "border-border bg-background text-ink-soft hover:border-ink/30 hover:text-ink"
              }`}
            >
              <TemplateMiniPreview variant={option.preview} brandColor={brandColor} />
              <div className="mt-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display text-sm font-semibold">{option.label}</div>
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                    {recommendation
                      ? `${Math.round(recommendation.score * 100)}% fit`
                      : option.bestFor}
                  </span>
                </div>
                {recommendation ? (
                  <p className="mt-2 text-xs leading-5 text-ink-soft">{recommendation.reason}</p>
                ) : (
                  <p className="mt-2 text-xs text-ink-soft">{option.description}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
