import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export function workbenchCodeMirrorTheme(): Extension[] {
  const theme = EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "13px",
      fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
    },
    ".cm-scroller": {
      overflow: "auto",
      lineHeight: "1.4",
    },
    ".cm-content": {
      caretColor: "hsl(var(--primary))",
      padding: "12px 0",
    },
    ".cm-gutters": {
      backgroundColor: "hsl(var(--secondary) / 0.35)",
      color: "hsl(var(--ink-soft))",
      borderRight: "1px solid hsl(var(--border))",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "hsl(var(--secondary) / 0.55)",
    },
    ".cm-activeLine": {
      backgroundColor: "hsl(var(--secondary) / 0.25)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "hsl(var(--primary) / 0.15) !important",
    },
    ".cm-cursor": {
      borderLeftColor: "hsl(var(--primary))",
    },
  });

  const highlight = HighlightStyle.define([
    { tag: t.keyword, color: "#7c3aed", fontWeight: "600" },
    { tag: [t.name, t.deleted, t.character, t.macroName], color: "#0e7490" },
    { tag: [t.propertyName], color: "#0369a1" },
    { tag: [t.function(t.variableName), t.labelName], color: "#b45309" },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#c2410c" },
    { tag: [t.definition(t.name), t.separator], color: "#334155" },
    { tag: [t.typeName, t.className, t.number, t.changed, t.annotation], color: "#0f766e" },
    { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link], color: "#be123c" },
    { tag: [t.meta, t.comment], color: "#64748b", fontStyle: "italic" },
    { tag: t.strong, fontWeight: "bold" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    { tag: t.link, color: "#0369a1", textDecoration: "underline" },
    { tag: t.heading, fontWeight: "bold", color: "#0f172a" },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#7c2d12" },
    { tag: [t.processingInstruction, t.string, t.inserted], color: "#15803d" },
  ]);

  return [theme, syntaxHighlighting(highlight)];
}
