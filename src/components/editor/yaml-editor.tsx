import Editor from '@monaco-editor/react';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function YamlEditor({ value, onChange }: YamlEditorProps) {
  return (
    <Editor
      height="100%"
      defaultLanguage="yaml"
      value={value}
      onChange={(v) => onChange(v || '')}
      theme="vs-dark"
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        padding: { top: 12 },
        renderLineHighlight: 'gutter',
        cursorBlinking: 'smooth',
      }}
    />
  );
}
