import { getThinkingModelName, postChat } from "@/lib/storefront-builder/agents/openaiChat";
import { summarizeFileDiff } from "@/lib/bolt/workbench-diff";

export type WorkbenchEditReview = {
  satisfied: boolean;
  feedback: string;
  should_retry: boolean;
  retry_guidance?: string;
  gaps: string[];
};

type ReviewJson = {
  satisfied?: boolean;
  feedback?: string;
  should_retry?: boolean;
  retry_guidance?: string;
  gaps?: string[];
};

function buildChangeSummary(args: {
  editedPaths: string[];
  beforeByPath: Record<string, string>;
  afterByPath: Record<string, string>;
}): string {
  const parts: string[] = [];

  for (const path of args.editedPaths) {
    const before = args.beforeByPath[path] ?? "";
    const after = args.afterByPath[path] ?? "";
    if (before === after) {
      parts.push(`${path}: no effective change`);
      continue;
    }

    const diff = summarizeFileDiff(before, after, 8);
    const preview = diff.preview
      .map((line) => {
        if (line.before != null && line.after != null) {
          return `  L${line.line}: "${line.before.trim()}" → "${line.after.trim()}"`;
        }
        if (line.after != null) return `  L${line.line}: + ${line.after.trim()}`;
        return `  L${line.line}: - ${(line.before ?? "").trim()}`;
      })
      .join("\n");

    parts.push(
      `${path} (+${diff.additions}/-${diff.deletions} lines):\n${preview || "  (diff too large to preview)"}`,
    );
  }

  return parts.length > 0 ? parts.join("\n\n") : "No files were changed.";
}

export async function reviewWorkbenchEdit(args: {
  userGoal: string;
  editedPaths: string[];
  beforeByPath: Record<string, string>;
  afterByPath: Record<string, string>;
  executorSummary: string;
  patchesApplied: number;
  previewErrors?: string;
  agentPlan?: string;
  attempt: number;
  maxAttempts: number;
}): Promise<WorkbenchEditReview> {
  const changeSummary = buildChangeSummary({
    editedPaths: args.editedPaths,
    beforeByPath: args.beforeByPath,
    afterByPath: args.afterByPath,
  });

  const lastAttempt = args.attempt >= args.maxAttempts - 1;
  const hasChanges = args.patchesApplied > 0 || args.editedPaths.length > 0;

  try {
    const data = await postChat({
      model: await getThinkingModelName(),
      messages: [
        {
          role: "system",
          content: [
            "You review code edits for a storefront workbench.",
            "Compare the user's request to what actually changed.",
            "Decide if the goal is met, explain clearly, and whether the editor should retry.",
            "Return JSON: { satisfied, feedback, should_retry, retry_guidance?, gaps[] }",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            user_request: args.userGoal,
            executor_summary: args.executorSummary,
            patches_applied: args.patchesApplied,
            edited_paths: args.editedPaths,
            changes: changeSummary,
            preview_errors: args.previewErrors ?? null,
            agent_plan: args.agentPlan ?? null,
            attempt: args.attempt + 1,
            max_attempts: args.maxAttempts,
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return fallbackReview(args);

    const parsed = JSON.parse(raw) as ReviewJson;
    const gaps = Array.isArray(parsed.gaps)
      ? parsed.gaps.filter((g): g is string => typeof g === "string" && g.trim().length > 0)
      : [];

    let should_retry = parsed.should_retry === true && !lastAttempt;
    let satisfied = parsed.satisfied === true;

    if (!hasChanges && !lastAttempt && args.previewErrors) {
      should_retry = true;
      satisfied = false;
    }
    if (lastAttempt) should_retry = false;

    return {
      satisfied,
      feedback: parsed.feedback?.trim() || args.executorSummary || "Review complete.",
      should_retry,
      retry_guidance: should_retry ? parsed.retry_guidance?.trim() : undefined,
      gaps,
    };
  } catch {
    return fallbackReview(args);
  }
}

function fallbackReview(args: {
  executorSummary: string;
  patchesApplied: number;
  attempt: number;
  maxAttempts: number;
}): WorkbenchEditReview {
  const lastAttempt = args.attempt >= args.maxAttempts - 1;
  const hasChanges = args.patchesApplied > 0;

  return {
    satisfied: hasChanges,
    feedback: args.executorSummary || (hasChanges ? "Edit applied." : "No changes applied."),
    should_retry: !lastAttempt && !hasChanges,
    gaps: [],
  };
}
