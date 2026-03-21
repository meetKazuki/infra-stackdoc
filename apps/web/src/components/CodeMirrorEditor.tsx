import React, { useRef, useEffect } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, indentWithTab, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, bracketMatching, foldGutter, HighlightStyle } from "@codemirror/language";
import { yaml } from "@codemirror/lang-yaml";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion } from "@codemirror/autocomplete";
import { lintGutter } from "@codemirror/lint";
import { tags } from "@lezer/highlight";

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const theme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    backgroundColor: "transparent",
  },
  ".cm-content": {
    caretColor: "#00e5ff",
    padding: "16px 0",
  },
  ".cm-cursor": {
    borderLeftColor: "#00e5ff",
    borderLeftWidth: "2px",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#00e5ff",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(0, 229, 255, 0.15) !important",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid rgba(0, 229, 255, 0.08)",
    color: "#546e7a",
    minWidth: "40px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(0, 229, 255, 0.06)",
    color: "#b0bec5",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(0, 229, 255, 0.04)",
  },
  ".cm-foldGutter .cm-gutterElement": {
    color: "#546e7a",
    cursor: "pointer",
  },
  ".cm-line": {
    padding: "0 16px",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-scroller::-webkit-scrollbar": {
    width: "6px",
  },
  ".cm-scroller::-webkit-scrollbar-track": {
    background: "transparent",
  },
  ".cm-scroller::-webkit-scrollbar-thumb": {
    background: "rgba(0, 229, 255, 0.15)",
    borderRadius: "3px",
  },
});

const highlightColors = HighlightStyle.define([
  { tag: tags.keyword, color: "#00e5ff", fontWeight: "bold" },
  { tag: tags.atom, color: "#d500f9" },
  { tag: tags.bool, color: "#d500f9" },
  { tag: tags.null, color: "#78909c" },
  { tag: tags.number, color: "#ffab00" },
  { tag: tags.string, color: "#a5d6a7" },
  { tag: tags.comment, color: "#546e7a", fontStyle: "italic" },
  { tag: tags.meta, color: "#90a4ae" },
  { tag: tags.propertyName, color: "#4dd0e1" },
  { tag: tags.definition(tags.propertyName), color: "#4dd0e1" },
  { tag: tags.typeName, color: "#ffab00" },
  { tag: tags.punctuation, color: "#78909c" },
  { tag: tags.separator, color: "#78909c" },
  { tag: tags.operator, color: "#78909c" },
  { tag: tags.variableName, color: "#e0f7fa" },
  { tag: tags.content, color: "#e0f7fa" },
  { tag: tags.name, color: "#4dd0e1" },
]);

const syntaxColors = EditorView.theme({
  // YAML keys
  ".cm-propertyName": { color: "#00e5ff" },
  ".cm-string": { color: "#00e676" },
  ".cm-number": { color: "#ffab00" },
  ".cm-bool": { color: "#d500f9" },
  ".cm-null": { color: "#78909c" },
  ".cm-comment": { color: "#455a64" },
  ".cm-meta": { color: "#78909c" },
  ".cm-punctuation": { color: "#546e7a" },
  ".cm-atom": { color: "#d500f9" },
  ".cm-keyword": { color: "#00e5ff" },
  ".cm-typeName": { color: "#ffab00" },
  ".cm-definition": { color: "#00e5ff" },
});

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        foldGutter(),
        bracketMatching(),
        highlightSelectionMatches(),
        autocompletion(),
        lintGutter(),
        yaml(),
        syntaxHighlighting(highlightColors),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        theme,
        syntaxColors,
        updateListener,
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. loading a new file)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (value !== currentContent) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        overflow: "hidden",
      }}
    />
  );
};
