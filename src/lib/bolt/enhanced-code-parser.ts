import { createCodeParser, type BoltParserHandlers } from "@/lib/code-parser";

const SHELL_LANGUAGES = new Set(["bash", "sh", "shell", "zsh", "fish", "powershell", "ps1"]);

const COMMAND_PATTERNS = [
  /^(npm|yarn|pnpm)\s+(install|run|start|build|dev|test|init|create|add|remove)/,
  /^(git)\s+(add|commit|push|pull|clone|status|checkout|branch|merge|rebase|init|remote|fetch|log)/,
  /^(docker|docker-compose)\s+/,
  /^(cat|chmod|cp|echo|mkdir|mv|rm|ls|pwd)\s*/,
  /^(node|python|python3)\s+/,
];

const CODE_BLOCK_PATTERNS: Array<{
  type: string;
  regex: RegExp;
}> = [
  {
    type: "file_path",
    regex: /(?:^|\n)([\w./-]+\.\w+):?\s*\n+```(\w*)\n([\s\S]*?)```/gim,
  },
  {
    type: "explicit_create",
    regex:
      /(?:create|update|modify|edit|write|add|generate|here'?s?|file:?)\s+(?:a\s+)?(?:new\s+)?(?:file\s+)?(?:called\s+)?[`'"]*([\w./-]+\.\w+)[`'"]*:?\s*\n+```(\w*)\n([\s\S]*?)```/gi,
  },
  {
    type: "comment_filename",
    regex: /```(\w*)\n(?:\/\/|#|<!--)\s*(?:file:?|filename:?)\s*([\w./-]+\.\w+).*?\n([\s\S]*?)```/gi,
  },
  {
    type: "in_filename",
    regex: /(?:in|for|update)\s+[`'"]*([\w./-]+\.\w+)[`'"]*:?\s*\n+```(\w*)\n([\s\S]*?)```/gi,
  },
  {
    type: "structured_file",
    regex:
      /```(?:json|jsx?|tsx?|html?)\n(\{[\s\S]*?"(?:name|version|scripts|dependencies|devDependencies)"[\s\S]*?\}|<\w+[^>]*>[\s\S]*?<\/\w+>[\s\S]*?)```/gi,
  },
];

export function hasBoltArtifacts(text: string): boolean {
  return /<boltArtifact/i.test(text);
}

export function enhanceMarkdownToBolt(input: string): string {
  if (!input.trim() || hasBoltArtifacts(input)) return input;

  const processed = new Set<string>();
  let artifactCounter = 0;
  let enhanced = input;

  enhanced = enhanced.replace(
    /```(bash|sh|shell|zsh|fish|powershell|ps1)\n([\s\S]*?)```/gi,
    (match, language, content) => {
      const hash = hashBlock(match);
      if (processed.has(hash)) return match;
      if (!isShellCommand(content, language)) return match;
      processed.add(hash);
      return wrapShellAction(content, artifactCounter++);
    },
  );

  for (const pattern of CODE_BLOCK_PATTERNS) {
    enhanced = enhanced.replace(pattern.regex, (match, ...args) => {
      const hash = hashBlock(match);
      if (processed.has(hash)) return match;

      let filePath: string;
      let language: string;
      let content: string;

      if (pattern.type === "comment_filename") {
        [language, filePath, content] = args as [string, string, string];
      } else if (pattern.type === "structured_file") {
        content = args[0] as string;
        language = match.includes("json") ? "json" : "tsx";
        filePath = inferFileNameFromContent(content, language);
      } else {
        [filePath, language, content] = args as [string, string, string];
      }

      if (isShellCommand(content, language)) {
        processed.add(hash);
        return wrapShellAction(content, artifactCounter++);
      }

      filePath = normalizeFilePath(filePath);
      if (!isValidFilePath(filePath)) return match;

      const needsContext =
        pattern.type !== "explicit_create" &&
        pattern.type !== "comment_filename" &&
        pattern.type !== "file_path";
      if (needsContext && !hasFileContext(enhanced, match)) return match;

      processed.add(hash);
      return wrapFileAction(filePath, content, artifactCounter++);
    });
  }

  return enhanced;
}

export function createEnhancedCodeParser(handlers: BoltParserHandlers = {}) {
  let rawText = "";
  let sawBoltArtifact = false;
  let fedLength = 0;
  let inner: ReturnType<typeof createCodeParser> | null = null;

  function ensureInner() {
    if (!inner) inner = createCodeParser(handlers);
    return inner;
  }

  function syncBoltStream() {
    const parser = ensureInner();
    if (rawText.length <= fedLength) return;
    parser.feed(rawText.slice(fedLength));
    fedLength = rawText.length;
  }

  function feed(chunk: string) {
    rawText += chunk;
    if (hasBoltArtifacts(rawText)) {
      sawBoltArtifact = true;
      syncBoltStream();
    }
  }

  function flush() {
    if (sawBoltArtifact && inner) {
      inner.flush();
      return;
    }

    const enhanced = enhanceMarkdownToBolt(rawText);
    if (hasBoltArtifacts(enhanced)) {
      const fallback = createCodeParser(handlers);
      fallback.feed(enhanced);
      fallback.flush();
    }
  }

  return { feed, flush };
}

function wrapFileAction(filePath: string, content: string, id: number): string {
  const title = filePath.split("/").pop() || "File";
  return `<boltArtifact id="artifact-fallback-${id}" title="${title}" type="bundled">
<boltAction type="file" filePath="${filePath}">
${content.trimEnd()}
</boltAction>
</boltArtifact>`;
}

function wrapShellAction(content: string, id: number): string {
  return `<boltArtifact id="artifact-shell-${id}" title="Shell Command" type="shell">
<boltAction type="shell">
${content.trim()}
</boltAction>
</boltArtifact>`;
}

function normalizeFilePath(filePath: string): string {
  return filePath
    .replace(/[`'"]/g, "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

function isValidFilePath(filePath: string): boolean {
  if (!/\.\w+$/.test(filePath)) return false;
  if (!/^[\w./-]+$/.test(filePath)) return false;

  const exclude = [
    /^\/?(tmp|temp|test|example)\//i,
    /\.(tmp|temp|bak|backup|old|orig)$/i,
    /^\/?(output|result|response)\//i,
    /^code_\d+\.(sh|bash|zsh)$/i,
    /^(untitled|new|demo|sample)\d*\./i,
  ];
  return !exclude.some((pattern) => pattern.test(filePath));
}

function hasFileContext(input: string, codeBlockMatch: string): boolean {
  const index = input.indexOf(codeBlockMatch);
  if (index === -1) return false;

  const before = input.slice(Math.max(0, index - 200), index);
  const after = input.slice(index + codeBlockMatch.length, index + codeBlockMatch.length + 100);
  const context = before + after;

  return [
    /\b(create|write|save|add|update|modify|edit|generate)\s+(a\s+)?(new\s+)?file/i,
    /\b(file|filename|filepath)\s*[:=]/i,
    /\b(in|to|as)\s+[`'"]?[\w./-]+\.[a-z]{2,4}[`'"]?/i,
    /\b(component|module|class|function)\s+\w+/i,
  ].some((pattern) => pattern.test(context));
}

function inferFileNameFromContent(content: string, language: string): string {
  const componentMatch = content.match(
    /(?:function|class|const|export\s+default\s+function|export\s+function)\s+(\w+)/,
  );
  if (componentMatch) {
    const ext = language === "tsx" ? ".tsx" : language === "jsx" ? ".jsx" : ".ts";
    return `src/components/${componentMatch[1]}${ext}`;
  }
  if (content.includes("function App") || content.includes("const App")) {
    return "src/App.tsx";
  }
  if (language === "json" && content.includes('"scripts"')) {
    return "package.json";
  }
  return `src/component-${Date.now()}.tsx`;
}

function hashBlock(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

function isShellCommand(content: string, language: string): boolean {
  if (!SHELL_LANGUAGES.has(language.toLowerCase())) return false;

  const trimmed = content.trim();
  const lines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;
  if (looksLikeScriptContent(trimmed)) return false;
  if (lines.length === 1) return isSingleLineCommand(lines[0]!);

  const commandLike = lines.filter(
    (line) => line.length > 0 && !line.startsWith("#") && isSingleLineCommand(line),
  );
  return commandLike.length / lines.length > 0.7;
}

function isSingleLineCommand(line: string): boolean {
  if (/[;&|]{1,2}/.test(line)) {
    return line
      .split(/[;&|]{1,2}/)
      .map((part) => part.trim())
      .every((part) => part.length > 0 && !looksLikeScriptContent(part));
  }

  let clean = line.replace(/^sudo\s+/, "");
  if (COMMAND_PATTERNS.some((pattern) => pattern.test(clean))) return true;

  const first = clean.split(/\s+/)[0] ?? "";
  return /^[a-z][\w-]*$/i.test(first) || /^\.?\/[\w./-]+$/i.test(first);
}

function looksLikeScriptContent(content: string): boolean {
  const indicators = [
    /^#!/,
    /function\s+\w+/,
    /^\w+\s*\(\s*\)\s*\{/,
    /^(if|for|while|case)\s+.*?(then|do|in)/,
    /^\w+=[^=].*$/,
    /^(local|declare|readonly)\s+/,
  ];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (indicators.some((pattern) => pattern.test(trimmed))) return true;
  }
  return false;
}
