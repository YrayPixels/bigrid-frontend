import type { CodeFile } from "@/lib/code-fs";
import { codeFs } from "@/lib/code-fs";
import { buildSearchQueries, searchCodeFiles, formatSearchResultsForPrompt } from "@/lib/bolt/code-search";
import { applySearchReplace, normalizePatchPath, readFileSlice } from "@/lib/bolt/file-patch";
import { mirrorCodeFileToWebContainer } from "@/lib/bolt/wc-file-sync";
import { postChat } from "@/lib/storefront-builder/agents/openaiChat";
import type { BuilderChatHistoryEntry } from "@/lib/storefront-builder/chat-history";

export type WorkbenchEditStep = {
  id: string;
  type: "think" | "grep" | "read" | "patch" | "list" | "done" | "error";
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
  const seedMatches = searchCodeFiles(args.files, seedQueries);

  emit({
    type: "think",
    title: "Planning edit",
    detail: args.instruction.slice(0, 200),
    status: "complete",
  });

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
    "4. finish_edit — when done",
    "",
    "RULES:",
    "- NEVER rewrite entire files. Only use search_replace with small, unique old_string snippets.",
    "- Copy old_string exactly from read_file output (without the line number prefix).",
    "- If grep finds nothing, try alternate terms or list_files.",
    "- Do not edit locked paths.",
    args.isNodeProject
      ? "- Vite + React + TanStack Router: header/nav/hero/footer live in src/routes/index.tsx. Do NOT edit src/styles.css for header/section colors — use className or style on the JSX element."
      : "- Keep the existing stack.",
    args.focusedPath ? `- User is viewing: ${args.focusedPath}` : "",
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
      tool_choice: "auto",
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
      } else if (name === "list_files") {
        const prefix = typeof parsed.path_prefix === "string" ? normalizePatchPath(parsed.path_prefix) : "";
        const paths = args.files
          .map((f) => normalizePatchPath(f.path))
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
          ok: patchesApplied > 0 || finished,
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
    ok: patchesApplied > 0,
    summary: summary || (patchesApplied > 0 ? `Applied ${patchesApplied} patch(es).` : "No changes applied."),
    patchesApplied,
    editedPaths: [...editedPaths],
    steps,
    finished,
  };
}
