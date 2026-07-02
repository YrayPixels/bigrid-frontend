import { LanguageDescription } from "@codemirror/language";

const languageDescriptions = [
  LanguageDescription.of({
    name: "TS",
    extensions: ["ts"],
    async load() {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript({ typescript: true });
    },
  }),
  LanguageDescription.of({
    name: "TSX",
    extensions: ["tsx"],
    async load() {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript({ typescript: true, jsx: true });
    },
  }),
  LanguageDescription.of({
    name: "JS",
    extensions: ["js", "mjs", "cjs"],
    async load() {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript();
    },
  }),
  LanguageDescription.of({
    name: "JSX",
    extensions: ["jsx"],
    async load() {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript({ jsx: true });
    },
  }),
  LanguageDescription.of({
    name: "HTML",
    extensions: ["html", "htm"],
    async load() {
      const { html } = await import("@codemirror/lang-html");
      return html();
    },
  }),
  LanguageDescription.of({
    name: "CSS",
    extensions: ["css"],
    async load() {
      const { css } = await import("@codemirror/lang-css");
      return css();
    },
  }),
  LanguageDescription.of({
    name: "JSON",
    extensions: ["json"],
    async load() {
      const { json } = await import("@codemirror/lang-json");
      return json();
    },
  }),
  LanguageDescription.of({
    name: "Markdown",
    extensions: ["md", "markdown"],
    async load() {
      const { markdown } = await import("@codemirror/lang-markdown");
      return markdown();
    },
  }),
];

export async function languageExtensionForPath(path: string) {
  const name = path.split("/").pop() ?? path;
  const match = LanguageDescription.matchFilename(languageDescriptions, name);
  if (!match) return [];
  return match.support ? [await match.load()] : [];
}

export function languageLabelForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript React",
    js: "JavaScript",
    jsx: "JavaScript React",
    json: "JSON",
    css: "CSS",
    html: "HTML",
    md: "Markdown",
  };
  return map[ext] ?? "Plain Text";
}
