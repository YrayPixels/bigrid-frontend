"use client";

import { Check, Circle, FileCode2, Globe, Sparkles, Wand2 } from "lucide-react";
import type { BuilderMessage } from "@/lib/api/types";
import { WorkbenchLiveActions } from "@/components/admin/builder/workbench-live-actions";
import type { WorkbenchEditStep } from "@/lib/bolt/workbench-edit-agent";
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

function publicToolLabel(name: string, changedPaths?: string[]) {
  // Specific actions based on what actually changed
  if (name === "refine_website_copy" && changedPaths?.length) {
    if (changedPaths.includes("media.hero_image_url")) return "Updating header photo";
    if (changedPaths.includes("media.about_image_url")) return "Updating about photo";
    if (changedPaths.some((p) => p.startsWith("hero."))) return "Updating hero section";
    if (changedPaths.some((p) => p.startsWith("about."))) return "Updating about section";
    if (changedPaths.some((p) => p.startsWith("seo."))) return "Updating SEO";
    if (changedPaths.some((p) => p.startsWith("pages.faq."))) return "Updating FAQ";
    if (changedPaths.some((p) => p.startsWith("pages.contact."))) return "Updating contact page";
    if (changedPaths.some((p) => p.startsWith("value_props."))) return "Updating value props";
    if (changedPaths.some((p) => p.includes("blocks."))) return "Updating homepage section";
    return "Refining website copy";
  }
  if (name === "apply_stock_images" && changedPaths?.length) {
    if (changedPaths.includes("media.hero_image_url") && changedPaths.includes("media.about_image_url"))
      return "Adding stock photos";
    if (changedPaths.includes("media.hero_image_url")) return "Adding header photo";
    if (changedPaths.includes("media.about_image_url")) return "Adding about photo";
  }
  switch (name) {
    case "capture_business_details":
      return "Learning about your business";
    case "design_website":
      return "Designing your website";
    case "generate_website":
      return "Building your website";
    case "refine_website_copy":
      return "Refining website copy";
    case "apply_stock_images":
      return "Adding stock photos";
    case "source_website_images":
      return "Finding brand photos";
    case "replace_template_images":
      return "Replacing template photos";
    case "switch_design":
      return "Switching design";
    case "apply_brand_color":
      return "Updating colors";
    case "change_font":
      return "Updating font";
    case "add_products":
      return "Adding products";
    case "generate_product_descriptions":
      return "Generating product descriptions";
    case "process_product_image":
      return "Analyzing product image";
    case "ask_clarifying_question":
      return "Asking for details";
    case "edit_custom_site_code":
      return "Editing site code";
    case "generate_custom_site":
      return "Generating custom site";
    default:
      return "Working on your website";
  }
}

function ImageSourceWidget({ payload }: { payload: Record<string, unknown> }) {
  const recommendations = Array.isArray(payload.image_recommendations)
    ? (payload.image_recommendations as Array<{ label?: string; url?: string; reason?: string; target?: string }>)
    : [];
  const searchTerms = Array.isArray(payload.search_terms)
    ? payload.search_terms.filter((term): term is string => typeof term === "string")
    : [];

  if (!recommendations.length && !searchTerms.length) return null;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border bg-background p-3">
      {recommendations.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {recommendations.map((entry) =>
            entry.url ? (
              <div key={`${entry.target}-${entry.url}`} className="overflow-hidden rounded-lg border border-border">
                <img src={entry.url} alt={entry.label ?? "Suggested photo"} className="h-24 w-full object-cover" />
                <div className="px-2 py-1.5 text-[11px] text-ink-soft">
                  <p className="font-medium text-ink">{entry.label ?? "Suggested photo"}</p>
                  {entry.reason ? <p className="mt-0.5">{entry.reason}</p> : null}
                </div>
              </div>
            ) : null,
          )}
        </div>
      ) : null}
      {searchTerms.length > 0 ? (
        <p className="text-[11px] text-ink-soft">Search terms: {searchTerms.join(", ")}</p>
      ) : null}
    </div>
  );
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
                      <span className="font-medium text-ink">{publicToolLabel(call.name ?? "action", result?.changed_paths)}</span>
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
    const nextSteps = Array.isArray(payload.next_steps)
      ? (payload.next_steps as Array<{ label: string; action: string; message?: string; target?: string; href?: string }>)
      : [];

    return (
      <div className="mt-3 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Globe className="h-3.5 w-3.5" />
          Website generated
        </div>
        {nextSteps.length > 0 ? (
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Next steps</p>
            <div className="space-y-1">
              {nextSteps.map((step, i) => (
                <button
                  key={step.label}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-ink transition hover:bg-secondary"
                  onClick={() => {
                    if (step.action === "prompt" && step.message) {
                      const textarea = document.querySelector<HTMLTextAreaElement>("textarea[placeholder]");
                      if (textarea) {
                        textarea.value = step.message;
                        textarea.focus();
                        textarea.dispatchEvent(new Event("input", { bubbles: true }));
                      }
                    } else if (step.action === "upload" && step.target) {
                      const fileInput = document.querySelector<HTMLInputElement>("input[type=file][accept*='image']");
                      fileInput?.click();
                    } else if (step.action === "add_products_prompt" && step.message) {
                      const textarea = document.querySelector<HTMLTextAreaElement>("textarea[placeholder]");
                      if (textarea) {
                        textarea.value = step.message;
                        textarea.focus();
                        textarea.dispatchEvent(new Event("input", { bubbles: true }));
                      }
                    }
                  }}
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-[10px] text-ink-soft">
                    {i + 1}
                  </span>
                  <span>{step.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (type === "custom_site_edited" || type === "custom_site_generated") {
    const boltLog = Array.isArray(payload.bolt_action_log)
      ? (payload.bolt_action_log as Array<{
          ok?: boolean;
          error?: string;
          action?: { type?: string; filePath?: string };
        }>)
      : [];
    const files = Array.isArray(payload.files) ? (payload.files as string[]) : [];
    const contextSelection = payload.context_selection as
      | {
          included?: string[];
          omitted?: string[];
          used_smart_context?: boolean;
          search_paths?: string[];
          search_match_count?: number;
        }
      | undefined;
    const fileDiffs = Array.isArray(payload.file_diffs)
      ? (payload.file_diffs as Array<{
          path: string;
          additions: number;
          deletions: number;
        }>)
      : [];
    const agentSteps = Array.isArray(payload.agent_steps)
      ? (payload.agent_steps as WorkbenchEditStep[])
      : [];

    return (
      <div className="mt-3 space-y-2 rounded-xl border border-border bg-background p-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <FileCode2 className="h-3.5 w-3.5" />
          {type === "custom_site_generated" ? "Custom site generated" : "Code updated"}
        </div>
        {agentSteps.length > 0 ? (
          <WorkbenchLiveActions actions={[]} agentSteps={agentSteps} streaming={false} />
        ) : null}
        {files.length > 0 ? (
          <ul className="space-y-1 text-[12px] text-ink-soft">
            {files.map((path) => (
              <li key={path} className="truncate font-mono text-ink">
                {path}
              </li>
            ))}
          </ul>
        ) : null}
        {fileDiffs.length > 0 ? (
          <ul className="space-y-1 text-[11px] text-ink-soft">
            {fileDiffs.map((diff) => (
              <li key={diff.path} className="flex items-center justify-between gap-2 font-mono text-ink">
                <span className="truncate">{diff.path}</span>
                <span className="shrink-0">
                  <span className="text-primary">+{diff.additions}</span> /{" "}
                  <span className="text-destructive">-{diff.deletions}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {boltLog.length > 0 ? (
          <ul className="space-y-1 text-[11px] text-ink-soft">
            {boltLog.map((entry, index) => (
              <li key={`${entry.action?.filePath ?? index}`} className="flex items-center gap-2">
                {entry.ok ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                )}
                <span className="truncate font-mono">
                  {entry.action?.filePath ?? entry.action?.type ?? "action"}
                  {entry.error ? ` — ${entry.error}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {contextSelection?.used_smart_context && contextSelection.included?.length ? (
          <p className="text-[10px] text-ink-soft">
            Context: {contextSelection.included.length} file
            {contextSelection.included.length === 1 ? "" : "s"} sent to AI
            {typeof contextSelection.search_match_count === "number" && contextSelection.search_match_count > 0
              ? ` · ${contextSelection.search_match_count} grep matches`
              : null}
            {contextSelection.omitted?.length
              ? ` (${contextSelection.omitted.length} omitted from ${files.length || contextSelection.included.length + contextSelection.omitted.length})`
              : null}
          </p>
        ) : null}
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

  if (type === "logo_applied") {
    const appliedLogo = typeof payload.logo_url === "string" ? payload.logo_url : null;
    return (
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        {appliedLogo ? (
          <>
            <img src={appliedLogo} alt="" className="h-5 w-5 rounded object-cover" />
            Logo updated
          </>
        ) : (
          "Logo removed"
        )}
      </div>
    );
  }

  if (type === "images_sourced") {
    return <ImageSourceWidget payload={payload} />;
  }

  if (type === "stock_images_applied" && Array.isArray(payload.image_recommendations)) {
    return <ImageSourceWidget payload={payload} />;
  }

  if (normalizeSuggestedActions(payload.suggested_actions).length && type === "conversation") {
    return colorOptions.length ? (
      <BuilderColorFeedback colors={colorOptions} activeColor={appliedColor} />
    ) : null;
  }

  return null;
}
