import type { CodeFile } from "@/lib/code-fs";
import { codeFs } from "@/lib/code-fs";
import { searchCodeFiles } from "@/lib/bolt/code-search";
import { applyPatchHunks, applySearchReplace, normalizePatchPath, readFileSlice } from "@/lib/bolt/file-patch";
import { mirrorCodeFileToWebContainer, mirrorDeleteFromWebContainer } from "@/lib/bolt/wc-file-sync";
import { getThinkingModel, postChat } from "@/lib/storefront-builder/agents/openaiChat";
import type { BuilderChatHistoryEntry } from "@/lib/storefront-builder/chat-history";
import { reviewWorkbenchEdit, type WorkbenchEditReview } from "@/lib/bolt/workbench-edit-review";
import { formatFileDiffForAgent, snapshotFileContents } from "@/lib/bolt/workbench-diff";
import {
  appendAgentScratchpad,
  clearAgentScratchpad,
  getAgentScratchpad,
  setAgentScratchpad,
} from "@/lib/bolt/workbench-agent-scratchpad";
import { inspectPreviewForAgent } from "@/lib/bolt/workbench-preview-inspect";
import { isViteReactProject } from "@/lib/bolt/select-context";
import {
  formatErrorsForAgent,
  getLatestWorkbenchErrors,
  getPreviewErrorsForAgent,
} from "@/lib/bolt/workbench-preview-errors";
import { getWebContainerOutputTail } from "@/lib/bolt/webcontainer-output";
import { runWebContainerCommand } from "@/lib/bolt/webcontainer-terminal";

export type WorkbenchEditStep = {
  id: string;
  type:
    | "think"
    | "grep"
    | "read"
    | "write"
    | "patch"
    | "delete"
    | "list"
    | "shell"
    | "verify"
    | "diff"
    | "revert"
    | "plan"
    | "preview"
    | "review"
    | "done"
    | "error";
  title: string;
  detail?: string;
  path?: string;
  status: "running" | "complete" | "failed";
};

type AssistantToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: AssistantToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

const MAX_ITERATIONS = 14;
const MAX_REVIEW_ATTEMPTS = 3;

const WORKBENCH_EDIT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "grep_codebase",
      description:
        "Search project source files for a string or regex pattern. Returns file paths, line numbers, and matching lines. Use this FIRST to find where to edit.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Text or regex pattern to search for" },
          path_prefix: { type: "string", description: "Optional path prefix filter, e.g. src/routes" },
          regex: { type: "boolean", description: "Treat pattern as regex (default false)" },
        },
        required: ["pattern"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "Read a file from the project with optional line range. Line numbers are shown in the output.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          start_line: { type: "number" },
          end_line: { type: "number" },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description:
        "Create a new file or replace an entire file. Use for new paths only, or set overwrite=true to replace an existing file. Prefer search_replace for small edits to existing files.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
          overwrite: {
            type: "boolean",
            description: "Allow replacing an existing file (default false)",
          },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_replace",
      description:
        "Apply a surgical edit by replacing exact old_string with new_string. old_string must match the file exactly (copy from read_file). Prefer small, unique snippets.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          old_string: { type: "string" },
          new_string: { type: "string" },
          replace_all: { type: "boolean" },
        },
        required: ["path", "old_string", "new_string"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_path",
      description:
        "Delete a file or folder from the project. For folders, pass the folder path (e.g. .lovable or .lovable/). Deletes all files under that prefix. Use when the user asks to remove or delete files or folders.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path (src/foo.ts) or folder (.lovable, .lovable/)",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_files",
      description: "List project file paths, optionally filtered by prefix.",
      parameters: {
        type: "object",
        properties: {
          path_prefix: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_command",
      description:
        "Run a shell command in the WebContainer project (e.g. grep in node_modules, cat a file, pnpm why tailwindcss). Do not run pnpm install unless dependencies are broken.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to run in project root" },
        },
        required: ["command"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "apply_patch",
      description:
        "Apply multiple search/replace hunks to one file in a single step. Each hunk needs exact old_string copied from read_file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          hunks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                old_string: { type: "string" },
                new_string: { type: "string" },
                replace_all: { type: "boolean" },
              },
              required: ["old_string", "new_string"],
              additionalProperties: false,
            },
          },
        },
        required: ["path", "hunks"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "show_diff",
      description: "Show what changed in a file compared to the start of this edit session.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "revert_path",
      description: "Restore a file to its content at the start of this edit session.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_terminal_output",
      description: "Read recent WebContainer boot, install, and dev-server terminal output.",
      parameters: {
        type: "object",
        properties: {
          max_chars: { type: "number", description: "Max characters to return (default 8000)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "inspect_preview",
      description:
        "Inspect the live preview: computed styles for a CSS selector, HTML excerpt, or screenshot (static preview only).",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector, e.g. header, .hero, body" },
          include_html: { type: "boolean" },
          include_screenshot: { type: "boolean" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_build",
      description: "Run the project production build (pnpm run build) and return output.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_plan",
      description: "Record your plan, hypotheses, or progress notes for this session.",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["append", "replace"] },
          notes: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["notes"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_plan",
      description: "Read your recorded plan and notes for this session.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_preview_errors",
      description:
        "Read compile/runtime errors from the live WebContainer preview. Call after edits to verify the preview. Optional wait_ms (0–5000) lets Vite HMR finish before reading.",
      parameters: {
        type: "object",
        properties: {
          wait_ms: {
            type: "number",
            description: "Milliseconds to wait before reading preview output (default 1500)",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "finish_edit",
      description: "Call when all edits are complete and the request is satisfied.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
        },
        required: ["summary"],
        additionalProperties: false,
      },
    },
  },
];

function stepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildAgentSystemPrompt(args: {
  files: CodeFile[];
  lockedPaths: string[];
  focusedPath?: string | null;
  taggedPaths?: string[];
  previewErrors?: string;
  isNodeProject?: boolean;
}): string {
  const paths = args.files.map((f) => normalizePatchPath(f.path)).sort();
  const stack = args.isNodeProject ? "vite_react_tanstack" : "static_html";

  return [
    "You are an autonomous agent for a merchant storefront code workbench.",
    "You have tools to explore and change this project — use them to decide what to do.",
    "grep_codebase, read_file, list_files, and run_command help you understand the codebase.",
    "search_replace edits existing files; write_file creates or replaces whole files; apply_patch applies multiple hunks.",
    "show_diff and revert_path help you review or undo changes in this session.",
    "get_preview_errors, get_terminal_output, run_build, and inspect_preview verify your work.",
    "update_plan / read_plan track your reasoning across steps.",
    "delete_path removes files or folders.",
    "Call finish_edit when you are done (including when no file changes were needed).",
    "",
    `Stack: ${stack}`,
    `Project files (${paths.length}): ${paths.join(", ")}`,
    args.focusedPath ? `User is viewing: ${normalizePatchPath(args.focusedPath)}` : "",
    args.taggedPaths?.length ? `User tagged: ${args.taggedPaths.map(normalizePatchPath).join(", ")}` : "",
    args.previewErrors ? `Active preview errors:\n${args.previewErrors}` : "",
    args.lockedPaths.length > 0 ? `Locked paths (do not edit): ${args.lockedPaths.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function grepFiles(files: CodeFile[], pattern: string, pathPrefix?: string, useRegex = false) {
  const liveFiles = codeFs.listFiles().length > 0 ? codeFs.exportFiles() : files;
  const prefix = pathPrefix?.replace(/^\/+/, "");
  const filtered = liveFiles.filter((file) => {
    if (file.encoding === "base64") return false;
    const path = normalizePatchPath(file.path);
    if (prefix && !path.startsWith(prefix)) return false;
    return true;
  });

  if (useRegex) {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, "i");
    } catch {
      return { ok: false as const, error: "Invalid regex pattern" };
    }

    const matches: Array<{ path: string; line: number; text: string }> = [];
    for (const file of filtered) {
      const path = normalizePatchPath(file.path);
      const lines = file.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!regex.test(lines[i]!)) continue;
        matches.push({ path, line: i + 1, text: lines[i]!.trimEnd() });
        if (matches.length >= 30) break;
      }
      if (matches.length >= 30) break;
    }
    return { ok: true as const, matches, count: matches.length };
  }

  const matches = searchCodeFiles(filtered, [pattern], { maxTotal: 30 });
  return {
    ok: true as const,
    matches: matches.map((m) => ({ path: m.path, line: m.line, text: m.text })),
    count: matches.length,
  };
}

export async function runWorkbenchEditAgent(args: {
  instruction: string;
  files: CodeFile[];
  lockedPaths?: string[];
  chatHistory?: BuilderChatHistoryEntry[];
  isNodeProject?: boolean;
  focusedPath?: string | null;
  taggedPaths?: string[];
  previewErrors?: string;
  onStep?: (step: WorkbenchEditStep) => void;
}): Promise<{
  ok: boolean;
  summary: string;
  patchesApplied: number;
  editedPaths: string[];
  steps: WorkbenchEditStep[];
  finished: boolean;
  review?: WorkbenchEditReview;
}> {
  const locked = new Set((args.lockedPaths ?? []).map(normalizePatchPath));
  const lockedList = [...locked];
  const steps: WorkbenchEditStep[] = [];
  let patchesApplied = 0;
  let pathsDeleted = 0;
  const editedPaths = new Set<string>();
  let summary = "";
  let finished = false;

  const emit = (step: Omit<WorkbenchEditStep, "id">) => {
    const full: WorkbenchEditStep = { id: stepId(), ...step };
    steps.push(full);
    args.onStep?.(full);
    return full;
  };

  clearAgentScratchpad();

  const systemPrompt = buildAgentSystemPrompt({
    files: args.files,
    lockedPaths: lockedList,
    focusedPath: args.focusedPath,
    taggedPaths: args.taggedPaths,
    previewErrors: args.previewErrors,
    isNodeProject: args.isNodeProject ?? isViteReactProject(args.files.map((f) => f.path)),
  });

  const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];

  for (const entry of args.chatHistory ?? []) {
    const content = entry.content.trim();
    if (!content) continue;
    messages.push({ role: entry.role, content });
  }

  messages.push({
    role: "user",
    content: args.instruction.trim(),
  });

  const allPaths = args.files.map((f) => normalizePatchPath(f.path));
  const sessionBeforeSnapshot = snapshotFileContents(args.files, allPaths);

  const deleteAttempts = new Set<string>();

  for (let attempt = 0; attempt < MAX_REVIEW_ATTEMPTS; attempt++) {
    let executorDone = false;

    if (attempt > 0) {
      emit({
        type: "think",
        title: `Retry ${attempt + 1} of ${MAX_REVIEW_ATTEMPTS}`,
        status: "running",
      });
    }

    for (let iteration = 0; iteration < MAX_ITERATIONS && !executorDone; iteration++) {
    const data = await postChat({
      model: getThinkingModel(),
      messages,
      tools: WORKBENCH_EDIT_TOOLS,
      tool_choice: iteration === 0 && attempt === 0 ? "required" : "auto",
      temperature: 0.2,
    });

    const assistant = data?.choices?.[0]?.message;
    if (!assistant) break;

    const rawCalls = (assistant as { tool_calls?: AssistantToolCall[] }).tool_calls;
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: typeof assistant.content === "string" ? assistant.content : null,
      ...(Array.isArray(rawCalls) ? { tool_calls: rawCalls } : {}),
    };
    messages.push(assistantMessage);

    if (assistantMessage.content?.trim()) {
      emit({
        type: "think",
        title: assistantMessage.content.trim().slice(0, 120),
        detail: assistantMessage.content.trim(),
        status: "complete",
      });
    }

    if (!assistantMessage.tool_calls?.length) {
      if (iteration < MAX_ITERATIONS - 1) {
        messages.push({
          role: "user",
          content:
            "You must use tools to edit: grep_codebase to find the target, read_file to inspect it, search_replace to patch, delete_path to remove files/folders, then finish_edit. Do not reply with text only.",
        });
        continue;
      }
      emit({
        type: "error",
        title: "Agent stopped without applying patches",
        detail: assistantMessage.content?.trim() || "No tool calls returned.",
        status: "failed",
      });
      break;
    }

    for (const toolCall of assistantMessage.tool_calls) {
      const name = toolCall.function?.name;
      const callId = toolCall.id;
      if (!name || !callId) continue;

      let parsed: Record<string, unknown> = {};
      try {
        parsed = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
      } catch {
        parsed = {};
      }

      let toolResult: Record<string, unknown> = { ok: false, error: "unknown_tool" };

      if (name === "grep_codebase") {
        const pattern = String(parsed.pattern ?? "");
        const pathPrefix = typeof parsed.path_prefix === "string" ? parsed.path_prefix : undefined;
        const useRegex = parsed.regex === true;
        emit({
          type: "grep",
          title: `Searching for "${pattern}"`,
          status: "running",
        });
        const result = grepFiles(args.files, pattern, pathPrefix, useRegex);
        if (!result.ok) {
          emit({ type: "grep", title: "Search failed", detail: result.error, status: "failed" });
          toolResult = result;
        } else {
          emit({
            type: "grep",
            title: `Found ${result.count} match${result.count === 1 ? "" : "es"}`,
            detail: result.matches
              .slice(0, 12)
              .map((m) => `${m.path}:${m.line}: ${m.text}`)
              .join("\n"),
            status: "complete",
          });
          toolResult = result;
        }
      } else if (name === "read_file") {
        const path = normalizePatchPath(String(parsed.path ?? ""));
        emit({ type: "read", title: `Reading ${path}`, path, status: "running" });
        const content = codeFs.readFile(path) ?? args.files.find((f) => normalizePatchPath(f.path) === path)?.content;
        if (content === undefined) {
          emit({ type: "read", title: `Read failed: ${path}`, detail: "File not found", path, status: "failed" });
          toolResult = { ok: false, error: "file_not_found", path };
        } else {
          const slice = readFileSlice(
            content,
            typeof parsed.start_line === "number" ? parsed.start_line : 1,
            typeof parsed.end_line === "number" ? parsed.end_line : undefined,
          );
          emit({
            type: "read",
            title: `Read ${path} (L${slice.startLine}-${slice.endLine})`,
            path,
            detail: slice.text.slice(0, 4000),
            status: "complete",
          });
          toolResult = { ok: true, path, ...slice, note: "Line numbers are for reference only — do NOT include them in search_replace old_string." };
        }
      } else if (name === "write_file") {
        const path = normalizePatchPath(String(parsed.path ?? ""));
        const content = String(parsed.content ?? "");
        const overwrite = parsed.overwrite === true;
        const exists = codeFs.readFile(path) !== undefined;

        emit({
          type: "write",
          title: exists ? `Writing ${path}` : `Creating ${path}`,
          path,
          status: "running",
        });

        if (locked.has(path)) {
          emit({ type: "write", title: `Blocked: ${path} is locked`, path, status: "failed" });
          toolResult = { ok: false, error: "path_locked", path };
        } else if (exists && !overwrite) {
          emit({
            type: "write",
            title: `File exists: ${path}`,
            detail: "Use search_replace for edits, or pass overwrite=true to replace the whole file.",
            path,
            status: "failed",
          });
          toolResult = {
            ok: false,
            error: "file_exists",
            path,
            message: "File already exists — use search_replace or overwrite=true.",
          };
        } else {
          codeFs.writeFile(path, content);
          mirrorCodeFileToWebContainer({ path, content });
          patchesApplied += 1;
          editedPaths.add(path);
          emit({
            type: "write",
            title: exists ? `Wrote ${path}` : `Created ${path}`,
            detail: `${content.length} bytes`,
            path,
            status: "complete",
          });
          toolResult = { ok: true, path, created: !exists, bytes: content.length };
        }
      } else if (name === "search_replace") {
        const path = normalizePatchPath(String(parsed.path ?? ""));
        const oldString = String(parsed.old_string ?? "");
        const newString = String(parsed.new_string ?? "");
        const replaceAll = parsed.replace_all === true;
        emit({
          type: "patch",
          title: `Patching ${path}`,
          path,
          status: "running",
        });

        if (locked.has(path)) {
          emit({ type: "patch", title: `Blocked: ${path} is locked`, path, status: "failed" });
          toolResult = { ok: false, error: "path_locked", path };
        } else {
          const current =
            codeFs.readFile(path) ??
            args.files.find((f) => normalizePatchPath(f.path) === path)?.content ??
            "";
          const patch = applySearchReplace(current, oldString, newString, replaceAll);
          if (!patch.ok) {
            emit({ type: "patch", title: `Patch failed: ${path}`, detail: patch.error, path, status: "failed" });
            toolResult = { ok: false, error: patch.error, path };
          } else {
            codeFs.writeFile(path, patch.content);
            mirrorCodeFileToWebContainer({ path, content: patch.content });
            patchesApplied += patch.replacements;
            editedPaths.add(path);
            emit({
              type: "patch",
              title: `Patched ${path}`,
              detail: `${patch.replacements} replacement(s)`,
              path,
              status: "complete",
            });
            toolResult = { ok: true, path, replacements: patch.replacements };
          }
        }
      } else if (name === "apply_patch") {
        const path = normalizePatchPath(String(parsed.path ?? ""));
        const hunks = Array.isArray(parsed.hunks) ? parsed.hunks : [];
        emit({
          type: "patch",
          title: `Applying ${hunks.length} hunk(s) to ${path}`,
          path,
          status: "running",
        });

        if (locked.has(path)) {
          emit({ type: "patch", title: `Blocked: ${path} is locked`, path, status: "failed" });
          toolResult = { ok: false, error: "path_locked", path };
        } else if (hunks.length === 0) {
          toolResult = { ok: false, error: "missing_hunks", path };
        } else {
          const current =
            codeFs.readFile(path) ??
            args.files.find((f) => normalizePatchPath(f.path) === path)?.content ??
            "";
          const normalizedHunks = hunks.map((hunk) => ({
            old_string: String((hunk as { old_string?: string }).old_string ?? ""),
            new_string: String((hunk as { new_string?: string }).new_string ?? ""),
            replace_all: (hunk as { replace_all?: boolean }).replace_all === true,
          }));
          const patch = applyPatchHunks(current, normalizedHunks);
          if (!patch.ok) {
            emit({
              type: "patch",
              title: `Patch failed: ${path}`,
              detail: `Hunk ${patch.hunk_index + 1}: ${patch.error}`,
              path,
              status: "failed",
            });
            toolResult = { ok: false, error: patch.error, path, hunk_index: patch.hunk_index };
          } else {
            codeFs.writeFile(path, patch.content);
            mirrorCodeFileToWebContainer({ path, content: patch.content });
            patchesApplied += patch.replacements;
            editedPaths.add(path);
            emit({
              type: "patch",
              title: `Patched ${path}`,
              detail: `${patch.replacements} replacement(s) across ${hunks.length} hunk(s)`,
              path,
              status: "complete",
            });
            toolResult = { ok: true, path, replacements: patch.replacements, hunks: hunks.length };
          }
        }
      } else if (name === "show_diff") {
        const path = normalizePatchPath(String(parsed.path ?? ""));
        const before = sessionBeforeSnapshot[path] ?? "";
        const after = codeFs.readFile(path) ?? before;
        const diffText = formatFileDiffForAgent(path, before, after);
        emit({
          type: "diff",
          title: `Diff ${path}`,
          path,
          detail: diffText.slice(0, 4000),
          status: before === after ? "complete" : "complete",
        });
        toolResult = { ok: true, path, changed: before !== after, diff: diffText };
      } else if (name === "revert_path") {
        const path = normalizePatchPath(String(parsed.path ?? ""));
        emit({ type: "revert", title: `Reverting ${path}`, path, status: "running" });
        if (!(path in sessionBeforeSnapshot)) {
          const exists = codeFs.readFile(path) !== undefined;
          if (exists) {
            codeFs.deletePath(path);
            mirrorDeleteFromWebContainer([path]);
            editedPaths.add(path);
            emit({ type: "revert", title: `Removed ${path} (new this session)`, path, status: "complete" });
            toolResult = { ok: true, path, removed: true };
          } else {
            emit({ type: "revert", title: `Nothing to revert for ${path}`, path, status: "failed" });
            toolResult = { ok: false, error: "file_not_in_session", path };
          }
        } else {
          const before = sessionBeforeSnapshot[path] ?? "";
          codeFs.writeFile(path, before);
          mirrorCodeFileToWebContainer({ path, content: before });
          editedPaths.add(path);
          emit({ type: "revert", title: `Reverted ${path}`, path, status: "complete" });
          toolResult = { ok: true, path, reverted: true };
        }
      } else if (name === "get_terminal_output") {
        const maxChars =
          typeof parsed.max_chars === "number" && Number.isFinite(parsed.max_chars)
            ? parsed.max_chars
            : 8000;
        const output = getWebContainerOutputTail(maxChars);
        emit({
          type: "shell",
          title: "Terminal output",
          detail: output.slice(0, 4000) || "(empty)",
          status: "complete",
        });
        toolResult = {
          ok: true,
          output: output || "(no terminal output captured yet)",
          chars: output.length,
        };
      } else if (name === "inspect_preview") {
        const selector = typeof parsed.selector === "string" ? parsed.selector : undefined;
        emit({
          type: "preview",
          title: selector ? `Inspect ${selector}` : "Inspect preview",
          status: "running",
        });
        const inspection = await inspectPreviewForAgent({
          selector,
          include_html: parsed.include_html === true,
          include_screenshot: parsed.include_screenshot === true,
        });
        emit({
          type: "preview",
          title: inspection.ok ? "Preview inspected" : "Preview inspect failed",
          detail: inspection.message,
          status: inspection.ok ? "complete" : "failed",
        });
        toolResult = { ...inspection };
      } else if (name === "run_build") {
        emit({ type: "shell", title: "pnpm run build", status: "running" });
        let output = "";
        const result = await runWebContainerCommand({
          command: "pnpm run build 2>&1",
          onOutput: (chunk) => {
            output = (output + chunk).slice(-12_000);
          },
        });
        emit({
          type: "shell",
          title: "pnpm run build",
          detail: output.slice(-4000) || `exit ${result.exitCode}`,
          status: result.exitCode === 0 ? "complete" : "failed",
        });
        toolResult = { ok: result.exitCode === 0, exit_code: result.exitCode, output: output.slice(-12_000) };
      } else if (name === "update_plan") {
        const notes = Array.isArray(parsed.notes)
          ? parsed.notes.filter((note): note is string => typeof note === "string" && note.trim().length > 0)
          : [];
        if (parsed.mode === "replace") {
          setAgentScratchpad(notes);
        } else {
          for (const note of notes) appendAgentScratchpad(note);
        }
        const plan = getAgentScratchpad();
        emit({
          type: "plan",
          title: "Plan updated",
          detail: plan.slice(0, 4000),
          status: "complete",
        });
        toolResult = { ok: true, plan };
      } else if (name === "read_plan") {
        const plan = getAgentScratchpad();
        emit({
          type: "plan",
          title: plan ? "Current plan" : "No plan recorded",
          detail: plan.slice(0, 4000) || undefined,
          status: "complete",
        });
        toolResult = { ok: true, plan: plan || "(empty)" };
      } else if (name === "delete_path") {
        const path = normalizePatchPath(String(parsed.path ?? ""));

        if (deleteAttempts.has(path)) {
          toolResult = {
            ok: true,
            path,
            already_absent: true,
            message: `Already handled delete for ${path}. Call finish_edit.`,
          };
        } else {
          deleteAttempts.add(path);
          emit({
            type: "delete",
            title: `Deleting ${path}`,
            path,
            status: "running",
          });

          const blocked = [...locked].some(
            (lockedPath) =>
              path === lockedPath || path.startsWith(`${lockedPath}/`) || lockedPath.startsWith(`${path}/`),
          );
          if (blocked) {
            emit({ type: "delete", title: `Blocked: ${path} is locked`, path, status: "failed" });
            toolResult = { ok: false, error: "path_locked", path };
          } else {
            const deleted = codeFs.deletePath(path);
            if (deleted.length === 0) {
              emit({
                type: "delete",
                title: `\`${path}\` is not in the project`,
                detail: "Already removed or not included in this workbench project.",
                path,
                status: "complete",
              });
              toolResult = {
                ok: true,
                path,
                already_absent: true,
                deleted_paths: [],
                count: 0,
                message: `Nothing to delete at ${path}. It is not in the project. Call finish_edit.`,
              };
            } else {
              mirrorDeleteFromWebContainer(deleted);
              pathsDeleted += deleted.length;
              for (const deletedPath of deleted) editedPaths.add(deletedPath);
              emit({
                type: "delete",
                title: `Deleted ${deleted.length} file${deleted.length === 1 ? "" : "s"}`,
                detail: deleted.join("\n"),
                path,
                status: "complete",
              });
              toolResult = { ok: true, path, deleted_paths: deleted, count: deleted.length };
            }
          }
        }
      } else if (name === "run_command") {
        const command = String(parsed.command ?? "").trim();
        emit({
          type: "shell",
          title: command.slice(0, 80) || "shell",
          detail: command,
          status: "running",
        });
        if (!command) {
          toolResult = { ok: false, error: "missing_command" };
        } else {
          let output = "";
          const result = await runWebContainerCommand({
            command,
            onOutput: (chunk) => {
              output = (output + chunk).slice(-8000);
            },
          });
          emit({
            type: "shell",
            title: command.slice(0, 80),
            detail: output.slice(-4000) || `exit ${result.exitCode}`,
            status: result.exitCode === 0 ? "complete" : "failed",
          });
          toolResult = { ok: result.exitCode === 0, exit_code: result.exitCode, output: output.slice(-8000) };
        }
      } else if (name === "list_files") {
        const prefix = typeof parsed.path_prefix === "string" ? normalizePatchPath(parsed.path_prefix) : "";
        const livePaths =
          codeFs.listFiles().length > 0 ? codeFs.listFiles() : args.files.map((f) => f.path);
        const paths = livePaths
          .map((p) => normalizePatchPath(p))
          .filter((p) => !prefix || p.startsWith(prefix))
          .sort();
        emit({
          type: "list",
          title: prefix ? `Files under ${prefix}` : "Project files",
          detail: paths.slice(0, 60).join("\n"),
          status: "complete",
        });
        toolResult = { ok: true, paths, count: paths.length };
      } else if (name === "get_preview_errors") {
        const waitMs =
          typeof parsed.wait_ms === "number" && Number.isFinite(parsed.wait_ms)
            ? parsed.wait_ms
            : 1500;
        emit({
          type: "verify",
          title: "Checking preview",
          detail: waitMs > 0 ? `Waiting ${waitMs}ms for HMR…` : undefined,
          status: "running",
        });
        const preview = await getPreviewErrorsForAgent(waitMs);
        emit({
          type: "verify",
          title: preview.has_errors ? "Preview has errors" : "Preview looks clean",
          detail: preview.message.slice(0, 4000),
          status: preview.has_errors ? "failed" : "complete",
        });
        toolResult = { ok: true, ...preview };
      } else if (name === "finish_edit") {
        summary = String(parsed.summary ?? "Edit complete.");
        executorDone = true;
        toolResult = { ok: true, finished: true, summary };
      }

      messages.push({ role: "tool", tool_call_id: callId, content: JSON.stringify(toolResult) });
    }
  }

    const editedPathList = [...editedPaths];
    const afterByPath: Record<string, string> = {};
    for (const path of editedPathList) {
      afterByPath[path] = codeFs.readFile(path) ?? sessionBeforeSnapshot[path] ?? "";
    }

    const livePreviewErrors =
      formatErrorsForAgent(getLatestWorkbenchErrors()) || args.previewErrors;

    const review = await reviewWorkbenchEdit({
      userGoal: args.instruction.trim(),
      editedPaths: editedPathList,
      beforeByPath: sessionBeforeSnapshot,
      afterByPath,
      executorSummary: summary || "Executor finished.",
      patchesApplied,
      previewErrors: livePreviewErrors,
      agentPlan: getAgentScratchpad() || undefined,
      attempt,
      maxAttempts: MAX_REVIEW_ATTEMPTS,
    });

    const reviewDetail = [
      review.feedback,
      review.gaps.length > 0 ? `\nGaps:\n${review.gaps.map((g) => `- ${g}`).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("");

    emit({
      type: "review",
      title: review.satisfied ? "Goal met" : review.should_retry ? "Needs more work" : "Review complete",
      detail: reviewDetail,
      status: review.satisfied ? "complete" : review.should_retry ? "failed" : "complete",
    });

    finished = review.satisfied || !review.should_retry;
    summary = review.feedback;

    if (review.satisfied || !review.should_retry) {
      emit({
        type: "done",
        title: summary,
        detail: review.gaps.length > 0 ? review.gaps.join("\n") : undefined,
        status: review.satisfied ? "complete" : "failed",
      });
      return {
        ok: review.satisfied,
        summary,
        patchesApplied,
        editedPaths: editedPathList,
        steps,
        finished: true,
        review,
      };
    }

    if (review.retry_guidance || review.should_retry) {
      messages.push({
        role: "user",
        content: [
          "REVIEW FEEDBACK — the previous pass did not fully satisfy the request. Retry with corrections:",
          review.retry_guidance ?? "Address the gaps listed below and ensure the change matches the plan understanding.",
          review.gaps.length > 0 ? `\nGaps to fix:\n${review.gaps.map((g) => `- ${g}`).join("\n")}` : "",
          "\nUse your tools to investigate and fix, then call finish_edit.",
        ].join(""),
      });
      emit({
        type: "think",
        title: "Retrying with review feedback",
        detail: review.retry_guidance ?? (review.gaps.join("; ") || "Applying corrections"),
        status: "complete",
      });
    }
  }

  return {
    ok: patchesApplied > 0 || pathsDeleted > 0,
    summary:
      summary ||
      (pathsDeleted > 0
        ? `Deleted ${pathsDeleted} file(s).`
        : patchesApplied > 0
          ? `Applied ${patchesApplied} patch(es).`
          : "No changes applied."),
    patchesApplied,
    editedPaths: [...editedPaths],
    steps,
    finished,
  };
}
