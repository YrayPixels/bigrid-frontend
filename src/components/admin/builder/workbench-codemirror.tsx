"use client";

import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, indentOnInput, indentUnit } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { Compartment, EditorState } from "@codemirror/state";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
  type KeyBinding,
} from "@codemirror/view";
import { lintGutter, lintKeymap } from "@codemirror/lint";
import { languageExtensionForPath } from "@/lib/bolt/codemirror-languages";
import { lintExtensionForPath, scrollEditorToLine } from "@/lib/bolt/codemirror-lint";
import { workbenchCodeMirrorTheme } from "@/lib/bolt/codemirror-theme";
import { registerWorkbenchEditorScroll } from "@/lib/bolt/workbench-editor-nav";

function copyTextToClipboard(text: string): boolean {
  if (!text) return false;

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (copied) return true;
  } catch {
    // Fall through to async clipboard API.
  }

  void navigator.clipboard?.writeText(text).catch(() => undefined);
  return true;
}

const clipboardKeymap: KeyBinding[] = [
  {
    key: "Mod-c",
    run: (view) => {
      const { from, to } = view.state.selection.main;
      if (from === to) return false;
      return copyTextToClipboard(view.state.sliceDoc(from, to));
    },
  },
  {
    key: "Mod-x",
    run: (view) => {
      if (view.state.readOnly) return false;
      const { from, to } = view.state.selection.main;
      if (from === to) return false;
      const text = view.state.sliceDoc(from, to);
      if (!copyTextToClipboard(text)) return false;
      view.dispatch(view.state.replaceSelection(""));
      return true;
    },
  },
];

type WorkbenchCodeMirrorProps = {
  path: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  streaming?: boolean;
  className?: string;
};

export function WorkbenchCodeMirror({
  path,
  value,
  onChange,
  readOnly = false,
  streaming = false,
  className,
}: WorkbenchCodeMirrorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const userEditingRef = useRef(false);
  const valueRef = useRef(value);
  const languageCompartment = useRef(new Compartment());
  const lintCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    userEditingRef.current = false;
    const initialValue = valueRef.current;

    const state = EditorState.create({
      doc: initialValue,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        drawSelection(),
        dropCursor(),
        indentUnit.of("  "),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        keymap.of([
          ...clipboardKeymap,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...completionKeymap,
          ...lintKeymap,
        ]),
        lintGutter(),
        languageCompartment.current.of([]),
        lintCompartment.current.of(lintExtensionForPath(path)),
        readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
        workbenchCodeMirrorTheme(),
        placeholder("Start typing…"),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          userEditingRef.current = true;
          onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });

    const view = new EditorView({ state, parent: container });
    viewRef.current = view;

    const unregisterScroll = registerWorkbenchEditorScroll((line) => {
      if (viewRef.current) scrollEditorToLine(viewRef.current, line);
    });

    void languageExtensionForPath(path).then((extensions) => {
      if (!viewRef.current) return;
      viewRef.current.dispatch({
        effects: languageCompartment.current.reconfigure(extensions),
      });
    });

    return () => {
      unregisterScroll();
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recreate only when path changes
  }, [path]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  useEffect(() => {
    void languageExtensionForPath(path).then((extensions) => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: languageCompartment.current.reconfigure(extensions),
      });
    });
  }, [path]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: lintCompartment.current.reconfigure(lintExtensionForPath(path)),
    });
  }, [path]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const current = view.state.doc.toString();
    if (current === value) return;

    // Don't replace the document while the user is selecting or editing.
    if (!streaming && view.hasFocus) return;

    const shouldApplyExternal = streaming || !userEditingRef.current;
    if (!shouldApplyExternal) return;

    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });

    if (streaming) {
      userEditingRef.current = false;
    }
  }, [value, streaming]);

  return <div ref={containerRef} className={className} />;
}
