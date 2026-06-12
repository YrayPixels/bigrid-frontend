"use client";

import { Check, Circle, Cpu, LayoutTemplate, Sparkles, Wand2 } from "lucide-react";
import type {
  BuilderMessage,
  StorefrontTemplateId,
  StorefrontTemplateOption,
  StorefrontTemplateRecommendation,
} from "@/lib/api/types";
import { BuilderTemplateRecommendations } from "@/components/admin/builder/builder-template-recommendations";

type ConcreteTemplateOption = StorefrontTemplateOption & { value: StorefrontTemplateId };

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
  template_id?: string;
  generation_id?: string;
  recommendations_count?: number;
  question?: string;
};

function toolLabel(name: string) {
  switch (name) {
    case "recommend_templates":
      return "Recommend templates";
    case "select_template":
      return "Select template";
    case "generate_draft":
      return "Generate draft";
    case "ask_clarifying_question":
      return "Ask for details";
    default:
      return name;
  }
}

function AgentTurnWidget({
  payload,
  brandColor,
  recommendations,
  templateOptions,
  selectedTemplateId,
  disabled,
  onSelectTemplate,
}: {
  payload: Record<string, unknown>;
  brandColor: string;
  recommendations: StorefrontTemplateRecommendation[];
  templateOptions: ConcreteTemplateOption[];
  selectedTemplateId: StorefrontTemplateId | null;
  disabled?: boolean;
  onSelectTemplate?: (templateId: StorefrontTemplateId) => void;
}) {
  const plan = Array.isArray(payload.plan) ? (payload.plan as AgentPlanStep[]) : [];
  const toolCalls = Array.isArray(payload.tool_calls) ? (payload.tool_calls as AgentToolCall[]) : [];
  const toolResults = Array.isArray(payload.tool_results)
    ? (payload.tool_results as AgentToolResult[])
    : [];
  const payloadRecommendations = Array.isArray(payload.recommendations)
    ? (payload.recommendations as StorefrontTemplateRecommendation[])
    : recommendations;
  const showRecommendations = toolCalls.some((call) => call.name === "recommend_templates");

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
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Actions</p>
          <ul className="mt-2 space-y-2">
            {toolCalls.map((call, index) => {
              const result = toolResults.find((entry) => entry.name === call.name);
              const ok = result?.ok ?? false;
              const Icon =
                call.name === "generate_draft"
                  ? Wand2
                  : call.name === "select_template"
                    ? LayoutTemplate
                    : call.name === "recommend_templates"
                      ? Sparkles
                      : Cpu;

              return (
                <li
                  key={`${call.name}-${index}`}
                  className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{toolLabel(call.name ?? "action")}</span>
                      {result ? (
                        ok ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-ink-soft" />
                        )
                      ) : null}
                    </div>
                    {call.name === "select_template" && typeof call.arguments?.template_id === "string" ? (
                      <p className="mt-1 text-ink-soft">{call.arguments.template_id}</p>
                    ) : null}
                    {result?.error ? (
                      <p className="mt-1 text-ink-soft">{result.error.replaceAll("_", " ")}</p>
                    ) : null}
                    {result?.generation_id ? (
                      <p className="mt-1 text-ink-soft">Draft ready</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {showRecommendations && payloadRecommendations.length > 0 && onSelectTemplate ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Templates</p>
          <div className="mt-2">
            <BuilderTemplateRecommendations
              brandColor={brandColor}
              recommendations={payloadRecommendations}
              templateOptions={templateOptions}
              selectedTemplateId={selectedTemplateId}
              disabled={disabled}
              onSelect={onSelectTemplate}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function BuilderMessageWidgets({
  message,
  brandColor,
  recommendations,
  templateOptions,
  selectedTemplateId,
  disabled,
  onSelectTemplate,
}: {
  message: BuilderMessage;
  brandColor: string;
  recommendations: StorefrontTemplateRecommendation[];
  templateOptions: ConcreteTemplateOption[];
  selectedTemplateId: StorefrontTemplateId | null;
  disabled?: boolean;
  onSelectTemplate?: (templateId: StorefrontTemplateId) => void;
}) {
  const payload = message.payload;
  if (!payload || typeof payload !== "object") return null;

  const type = payload.type;
  if (type === "agent_turn") {
    return (
      <AgentTurnWidget
        payload={payload}
        brandColor={brandColor}
        recommendations={recommendations}
        templateOptions={templateOptions}
        selectedTemplateId={selectedTemplateId}
        disabled={disabled}
        onSelectTemplate={onSelectTemplate}
      />
    );
  }

  if (type === "draft_generated") {
    return (
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        Storefront draft generated
      </div>
    );
  }

  if (type === "edit_applied" && Array.isArray(payload.changed_paths) && payload.changed_paths.length > 0) {
    return (
      <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs text-ink-soft">
        Updated: {(payload.changed_paths as string[]).join(", ")}
      </div>
    );
  }

  if (type === "template_selected" && typeof payload.template_id === "string") {
    return (
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-ink">
        <LayoutTemplate className="h-3.5 w-3.5" />
        Template: {payload.template_id}
      </div>
    );
  }

  return null;
}
