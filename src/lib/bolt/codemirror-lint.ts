import { syntaxTree } from "@codemirror/language";
import { jsonParseLinter } from "@codemirror/lang-json";
import { linter, type Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

const LINT_DELAY_MS = 350;

let typescriptModule: typeof import("typescript") | null = null;
let typescriptLoading: Promise<typeof import("typescript")> | null = null;

function loadTypeScript() {
  if (typescriptModule) return Promise.resolve(typescriptModule);
  if (!typescriptLoading) {
    typescriptLoading = import("typescript").then((mod) => {
      typescriptModule = mod;
      return mod;
    });
  }
  return typescriptLoading;
}

function isCodeLintPath(path: string): boolean {
  return /\.(tsx?|jsx?|mjs|cjs)$/i.test(path);
}

function isJsonPath(path: string): boolean {
  return /\.json$/i.test(path);
}

function lezerSyntaxDiagnostics(view: EditorView): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  syntaxTree(view.state).iterate({
    enter(node) {
      if (!node.type.isError) return;
      diagnostics.push({
        from: node.from,
        to: Math.max(node.from + 1, node.to),
        severity: "error",
        message: "Syntax error",
      });
    },
  });
  return diagnostics;
}

function typescriptDiagnosticToCm(
  ts: typeof import("typescript"),
  diagnostic: import("typescript").Diagnostic,
): Diagnostic | null {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (!message) return null;

  const severity =
    diagnostic.category === ts.DiagnosticCategory.Warning
      ? "warning"
      : diagnostic.category === ts.DiagnosticCategory.Error
        ? "error"
        : "info";

  if (diagnostic.start !== undefined && diagnostic.length !== undefined) {
    return {
      from: diagnostic.start,
      to: diagnostic.start + diagnostic.length,
      severity,
      message,
    };
  }

  if (diagnostic.file && diagnostic.start !== undefined) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    const lineStart = diagnostic.file.getPositionOfLineAndCharacter(line, character);
    return {
      from: lineStart,
      to: lineStart + 1,
      severity,
      message: `${message} (line ${line + 1})`,
    };
  }

  return {
    from: 0,
    to: 1,
    severity,
    message,
  };
}

async function typescriptSyntaxDiagnostics(code: string, fileName: string): Promise<Diagnostic[]> {
  const ts = await loadTypeScript();
  const isTsx = fileName.endsWith(".tsx");
  const isJsx = fileName.endsWith(".jsx");

  const result = ts.transpileModule(code, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: isTsx || isJsx ? ts.JsxEmit.ReactJSX : ts.JsxEmit.None,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      isolatedModules: true,
      allowJs: fileName.endsWith(".js") || fileName.endsWith(".jsx"),
    },
  });

  return (result.diagnostics ?? [])
    .filter(
      (diagnostic) =>
        diagnostic.category === ts.DiagnosticCategory.Error ||
        diagnostic.category === ts.DiagnosticCategory.Warning,
    )
    .map((diagnostic) => typescriptDiagnosticToCm(ts, diagnostic))
    .filter((diagnostic): diagnostic is Diagnostic => diagnostic !== null);
}

function mergeDiagnostics(primary: Diagnostic[], secondary: Diagnostic[]): Diagnostic[] {
  const merged = [...primary];
  for (const candidate of secondary) {
    const overlaps = merged.some(
      (existing) =>
        existing.message === candidate.message &&
        Math.abs(existing.from - candidate.from) < 3 &&
        Math.abs(existing.to - candidate.to) < 3,
    );
    if (!overlaps) merged.push(candidate);
  }
  return merged;
}

function workbenchCodeLinter(path: string) {
  return linter(
    async (view) => {
      const code = view.state.doc.toString();
      if (!code.trim()) return [];

      const lezerDiagnostics = lezerSyntaxDiagnostics(view);

      if (!isCodeLintPath(path)) {
        return lezerDiagnostics;
      }

      try {
        const tsDiagnostics = await typescriptSyntaxDiagnostics(code, path);
        return mergeDiagnostics(tsDiagnostics, lezerDiagnostics);
      } catch {
        return lezerDiagnostics;
      }
    },
    { delay: LINT_DELAY_MS },
  );
}

export function lintExtensionForPath(path: string): Extension[] {
  if (!path) return [];
  if (isJsonPath(path)) return [linter(jsonParseLinter())];
  if (!isCodeLintPath(path) && !/\.(css|html?|md)$/i.test(path)) {
    return [];
  }
  return [workbenchCodeLinter(path)];
}

export function scrollEditorToLine(view: EditorView, line: number) {
  const safeLine = Math.min(Math.max(line, 1), view.state.doc.lines);
  const docLine = view.state.doc.line(safeLine);
  view.dispatch({
    effects: EditorView.scrollIntoView(docLine.from, { y: "center" }),
    selection: { anchor: docLine.from },
  });
  view.focus();
}
