import type { CodeFile } from "@/lib/code-fs";
import { codeFs } from "@/lib/code-fs";
import { buildSearchQueries, searchCodeFiles, formatSearchResultsForPrompt } from "@/lib/bolt/code-search";
import { applySearchReplace, normalizePatchPath, readFileSlice } from "@/lib/bolt/file-patch";
import { isWorkbenchEditRequest } from "@/lib/bolt/workbench-intent";
import { mirrorCodeFileToWebContainer, mirrorDeleteFromWebContainer } from "@/lib/bolt/wc-file-sync";
import { postChat } from "@/lib/storefront-builder/agents/openaiChat";
import type { BuilderChatHistoryEntry } from "@/lib/storefront-builder/chat-history";

export type WorkbenchEditStep = {
  id: string;
  type: "think" | "grep" | "read" | "patch" | "delete" | "list" | "done" | "error";
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

function extractDeleteTarget(instruction: string): string | null {
  if (/\b\.lovable\b/i.test(instruction)) {
    return ".lovable";
  }

  const explicit = instruction.match(
    /\b(?:delete|remove)\s+(?:the\s+)?['"`]?([.@\w][^\s'"`,]*?)['"`]?(?:\s+(?:folder|directory|file))?\b/i,
  );
  if (explicit?.[1]) {
    return normalizePatchPath(explicit[1].replace(/\/+$/, ""));
  }

  const fileOnly = instruction.match(/\bfile\s+['"`]?([^\s'"`,]+)['"`]?/i);
  if (fileOnly?.[1]) {
    return normalizePatchPath(fileOnly[1]);
  }

  return null;
}

function deleteTargetLabel(target: string, deletedPaths: string[]): string {
  if (deletedPaths.length === 1 && !target.endsWith("/")) {
    return `\`${deletedPaths[0]}\``;
  }
  if (target.includes(".") && !target.endsWith("/")) {
    return `\`${target}\``;
  }
  return `\`${target}\` folder`;
}

function projectHasPathPrefix(paths: string[], target: string): boolean {
  const normalized = target.replace(/\/+$/, "");
  return paths.some((path) => {
    const filePath = normalizePatchPath(path);
    return (
      filePath === normalized ||
      filePath.toLowerCase() === normalized.toLowerCase() ||
      filePath.startsWith(`${normalized}/`) ||
      filePath.toLowerCase().startsWith(`${normalized.toLowerCase()}/`)
    );
  });
}

function tryFastDeletePath(args: {
  instruction: string;
  files: CodeFile[];
  emit: (step: Omit<WorkbenchEditStep, "id">) => WorkbenchEditStep;
}): {
  ok: boolean;
  summary: string;
  patchesApplied: number;
  editedPaths: string[];
  steps: WorkbenchEditStep[];
  finished: boolean;
} | null {
  const hasDeleteIntent =
    /\b(delete|remove|unlink)\b/i.test(args.instruction) ||
    /\bnot\s+a\s+folder\b/i.test(args.instruction);
  if (!hasDeleteIntent) return null;

  const target = extractDeleteTarget(args.instruction);
  if (!target) return null;

  const livePaths =
    codeFs.listFiles().length > 0 ? codeFs.listFiles() : args.files.map((file) => file.path);

  if (!projectHasPathPrefix(livePaths, target)) {
    const label = deleteTargetLabel(target, []);
    args.emit({
      type: "delete",
      title: `${label} is not in the project`,
      detail: "Already removed or not included in this workbench project.",
      path: target,
      status: "complete",
    });
    return {
      ok: true,
      summary: `${label} is not in your project — nothing to delete.`,
      patchesApplied: 0,
      editedPaths: [],
      steps: [],
      finished: true,
    };
  }

  const deleted = codeFs.deletePath(target);
  if (deleted.length === 0) {
    const label = deleteTargetLabel(target, []);
    args.emit({
      type: "delete",
      title: `${label} is not in the project`,
      detail: "Already removed or not included in this workbench project.",
      path: target,
      status: "complete",
    });
    return {
      ok: true,
      summary: `${label} is not in your project — nothing to delete.`,
      patchesApplied: 0,
      editedPaths: [],
      steps: [],
      finished: true,
    };
  }

  mirrorDeleteFromWebContainer(deleted);
  const label = deleteTargetLabel(target, deleted);
  args.emit({
    type: "delete",
    title: `Deleted ${label}`,
    detail: deleted.join("\n"),
    path: target,
    status: "complete",
  });
  return {
    ok: true,
    summary: `Deleted ${label}.`,
    patchesApplied: 0,
    editedPaths: deleted,
    steps: [],
    finished: true,
  };
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
}> {
  const locked = new Set((args.lockedPaths ?? []).map(normalizePatchPath));
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

  const seedQueries = buildSearchQueries(args.instruction);
  const seedMatches = isWorkbenchEditRequest(args.instruction)
    ? searchCodeFiles(args.files, seedQueries)
    : [];

  emit({
    type: "think",
    title: "Planning edit",
    detail: args.instruction.slice(0, 200),
    status: "complete",
  });

  const fastDelete = tryFastDeletePath({
    instruction: args.instruction,
    files: args.files,
    emit,
  });
  if (fastDelete) {
    emit({
      type: "done",
      title: fastDelete.summary,
      status: "complete",
    });
    return {
      ...fastDelete,
      steps,
    };
  }

  const deleteAttempts = new Set<string>();

  if (seedMatches.length > 0) {
    emit({
      type: "grep",
      title: `Pre-search: ${seedMatches.length} match${seedMatches.length === 1 ? "" : "es"}`,
      detail: formatSearchResultsForPrompt(seedMatches, 8),
      status: "complete",
    });
  }

  const systemPrompt = [
    "You are a Cursor-style code editing agent for a merchant website workbench.",
    "Workflow (required):",
    "1. grep_codebase — find the exact file and line(s) to change",
    "2. read_file — read surrounding lines with line numbers",
    "3. search_replace — apply minimal exact-match patches (copy old_string verbatim from read_file)",
    "4. delete_path — remove a file or folder when the user asks to delete/remove it",
    "5. finish_edit — when done",
    "",
    "RULES:",
    "- If the user message is only a greeting or general chat (not a code change), call finish_edit immediately with a brief friendly reply. Do NOT grep or read files.",
    "- NEVER rewrite entire files. Only use search_replace with small, unique old_string snippets.",
    "- For delete/remove requests, use delete_path once (e.g. path `.lovable` removes the whole .lovable folder).",
    "- If delete_path returns already_absent, call finish_edit immediately — do not grep, list_files, or retry delete_path.",
    "- Copy old_string exactly from read_file output (without the line number prefix).",
    "- If grep finds nothing, try alternate terms or list_files.",
    "- Do not edit locked paths.",
    args.isNodeProject
      ? "- Vite + React + TanStack Router: header/nav/hero/footer live in src/routes/index.tsx. Do NOT edit src/styles.css for header/section colors — use className or style on the JSX element."
      : "- Keep the existing stack.",
    args.focusedPath ? `- User is viewing: ${args.focusedPath}` : "",
    args.taggedPaths && args.taggedPaths.length > 0
      ? `- User tagged paths with @ (files or folders expanded to project files): ${args.taggedPaths.join(", ")} — prioritize edits there.`
      : "",
    args.previewErrors
      ? "- Active WebContainer preview errors are listed in the user message. Fix them before calling finish_edit when the user asks to fix errors or your edits likely caused them."
      : "",
    locked.size > 0 ? `- Locked paths: ${[...locked].join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const entry of args.chatHistory ?? []) {
    const content = entry.content.trim();
    if (!content) continue;
    messages.push({ role: entry.role, content });
  }

  messages.push({
    role: "user",
    content: [
      `Edit request: ${args.instruction}`,
      args.previewErrors ? `\nWebContainer preview errors:\n${args.previewErrors}` : "",
      seedMatches.length > 0
        ? `\nInitial grep hints:\n${formatSearchResultsForPrompt(seedMatches, 16)}`
        : "",
      `\nProject has ${args.files.length} files. Use tools to search, read, and patch.`,
    ].join(""),
  });

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const data = await postChat({
      messages,
      tools: WORKBENCH_EDIT_TOOLS,
      tool_choice: iteration === 0 ? "required" : "auto",
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
          const current = codeFs.readFile(path) ?? "";
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
      } else if (name === "finish_edit") {
        summary = String(parsed.summary ?? "Edit complete.");
        finished = true;
        emit({ type: "done", title: summary, status: "complete" });
        toolResult = { ok: true, finished: true, summary };
      }

      messages.push({ role: "tool", tool_call_id: callId, content: JSON.stringify(toolResult) });

      if (finished) {
        return {
          ok: patchesApplied > 0 || pathsDeleted > 0 || finished,
          summary: summary || "Edit complete.",
          patchesApplied,
          editedPaths: [...editedPaths],
          steps,
          finished: true,
        };
      }
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
