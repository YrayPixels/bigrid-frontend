"use client";

import { Check, Circle, Globe, Sparkles, Wand2 } from "lucide-react";
import type { BuilderMessage } from "@/lib/api/types";
import { isTechnicalEditMessage } from "@/lib/storefront-builder/edit-summary";
import { BuilderColorFeedback } from "@/components/admin/builder/builder-suggested-actions";
import { normalizeSuggestedActions } from "@/lib/storefront-builder/suggested-actions";

type AgentPlanStep = {
  step?: number;
  description?: string;
};

type AgentToolCall = {
  name?: string;
  arguments?: Record<string, unknown>;
};

type AgentToolResult = {
  name?: string;
  ok?: boolean;
  error?: string;
  changed_paths?: string[];
};

function publicToolLabel(name: string) {
  switch (name) {
    case "capture_business_details":
      return "Learning about your business";
    case "design_website":
      return "Designing your website";
    case "generate_website":
      return "Building your website";
    case "refine_website_copy":
      return "Refining website copy";
    case "ask_clarifying_question":
      return "Asking for details";
    default:
      return "Working on your website";
  }
}

function AgentTurnWidget({ payload }: { payload: Record<string, unknown> }) {
  const plan = Array.isArray(payload.plan) ? (payload.plan as AgentPlanStep[]) : [];
  const toolCalls = Array.isArray(payload.tool_calls) ? (payload.tool_calls as AgentToolCall[]) : [];
  const toolResults = Array.isArray(payload.tool_results)
    ? (payload.tool_results as AgentToolResult[])
    : [];

  if (!plan.length && !toolCalls.length) return null;

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border bg-background p-3">
      {plan.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Plan</p>
          <ol className="mt-2 space-y-1.5">
            {plan.map((step, index) => (
              <li key={`${step.step ?? index}-${step.description ?? index}`} className="flex gap-2 text-xs">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-semibold text-ink-soft">
                  {step.step ?? index + 1}
                </span>
                <span className="text-ink-soft">{step.description ?? "Next step"}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {toolCalls.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Progress</p>
          <ul className="mt-2 space-y-2">
            {toolCalls.map((call, index) => {
              const result = toolResults.find((entry) => entry.name === call.name);
              const ok = result?.ok ?? false;
              const Icon =
                call.name === "generate_website"
                  ? Globe
                  : call.name === "refine_website_copy"
                    ? Wand2
                    : call.name === "design_website"
                      ? Sparkles
                      : Globe;

              return (
                <li
                  key={`${call.name}-${index}`}
                  className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{publicToolLabel(call.name ?? "action")}</span>
                      {result ? (
                        ok ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-ink-soft" />
                        )
                      ) : null}
                    </div>
                    {result?.error ? (
                      <p className="mt-1 text-ink-soft">{result.error.replaceAll("_", " ")}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function BuilderMessageWidgets({
  message,
  brandColor,
}: {
  message: BuilderMessage;
  brandColor: string;
}) {
  const payload = message.payload;
  if (!payload || typeof payload !== "object") return null;

  const type = payload.type;

  const colorOptions = Array.isArray(payload.color_options)
    ? payload.color_options.filter((value): value is string => typeof value === "string")
    : [];
  const appliedColor = typeof payload.brand_color === "string" ? payload.brand_color : brandColor;

  if (type === "agent_turn") {
    return <AgentTurnWidget payload={payload} />;
  }

  if (type === "website_generated" || type === "draft_generated") {
    return (
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Globe className="h-3.5 w-3.5" />
        Website generated
      </div>
    );
  }

  if (type === "website_refined" || (type === "edit_applied" && Array.isArray(payload.changed_paths))) {
    const changedPaths = payload.changed_paths as string[] | undefined;
    if (!changedPaths?.length) return null;
    return (
      <>
        {!isTechnicalEditMessage(message.content) ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Wand2 className="h-3.5 w-3.5" />
            Preview updated
          </div>
        ) : null}
        {colorOptions.length ? (
          <BuilderColorFeedback colors={colorOptions} activeColor={appliedColor} />
        ) : null}
      </>
    );
  }

  if (type === "brand_color_applied" && typeof payload.brand_color === "string") {
    return (
      <BuilderColorFeedback
        colors={colorOptions.length ? colorOptions : [payload.brand_color as string]}
        activeColor={payload.brand_color as string}
      />
    );
  }

  if (normalizeSuggestedActions(payload.suggested_actions).length && type === "conversation") {
    return colorOptions.length ? (
      <BuilderColorFeedback colors={colorOptions} activeColor={appliedColor} />
    ) : null;
  }

  return null;
}
