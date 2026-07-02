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
      userSelect: "text",
    },
    ".cm-editor": {
      height: "100%",
    },
    ".cm-scroller": {
      overflow: "auto",
      lineHeight: "1.4",
    },
    ".cm-content": {
      caretColor: "var(--primary)",
      padding: "12px 0",
      userSelect: "text",
    },
    ".cm-gutters": {
      backgroundColor: "hsl(var(--secondary) / 0.35)",
      color: "hsl(var(--ink-soft))",
      borderRight: "1px solid hsl(var(--border))",
      userSelect: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "hsl(var(--secondary) / 0.55)",
    },
    ".cm-activeLine": {
      backgroundColor: "hsl(var(--secondary) / 0.25)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent) !important",
    },
    ".cm-content ::selection": {
      backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent)",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--primary)",
    },
    ".cm-gutter-lint": {
      width: "1.1rem",
    },
    ".cm-gutter-lint .cm-gutterElement": {
      paddingInline: "0.1rem",
    },
    ".cm-lintRange-error": {
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='m0 3 l3 -3 l3 3' fill='%23dc2626'/%3E%3C/svg%3E\")",
      backgroundRepeat: "repeat-x",
      backgroundPosition: "left bottom",
    },
    ".cm-lintRange-warning": {
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='m0 3 l3 -3 l3 3' fill='%23d97706'/%3E%3C/svg%3E\")",
      backgroundRepeat: "repeat-x",
      backgroundPosition: "left bottom",
    },
    ".cm-tooltip.cm-tooltip-lint": {
      maxWidth: "min(28rem, 90vw)",
      fontSize: "12px",
      lineHeight: "1.4",
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
