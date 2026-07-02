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
} from "@codemirror/view";
import { languageExtensionForPath } from "@/lib/bolt/codemirror-languages";
import { workbenchCodeMirrorTheme } from "@/lib/bolt/codemirror-theme";

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
  const languageCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const state = EditorState.create({
      doc: value,
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
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...completionKeymap,
        ]),
        languageCompartment.current.of([]),
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

    void languageExtensionForPath(path).then((extensions) => {
      if (!viewRef.current) return;
      viewRef.current.dispatch({
        effects: languageCompartment.current.reconfigure(extensions),
      });
    });

    return () => {
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

    const current = view.state.doc.toString();
    if (current === value) return;

    const shouldApplyExternal = streaming || !userEditingRef.current;
    if (!shouldApplyExternal) return;

    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });

    if (streaming) {
      userEditingRef.current = false;
    }
  }, [value, streaming]);

  useEffect(() => {
    userEditingRef.current = false;
  }, [path]);

  return <div ref={containerRef} className={className} />;
}
