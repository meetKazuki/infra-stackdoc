import React, { useCallback } from "react";
import type { ValidationError } from "@homelab-topology/core";

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  errors: ValidationError[];
}

export const YamlEditor: React.FC<YamlEditorProps> = ({
  value,
  onChange,
  errors,
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warningCount = errors.filter((e) => e.severity === "warning").length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#06090f",
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid rgba(0,229,255,0.12)",
          fontSize: 11,
          color: "#78909c",
        }}
      >
        <span style={{ letterSpacing: "0.05em", textTransform: "uppercase" }}>
          homelab.yaml
        </span>
        <div style={{ display: "flex", gap: 12 }}>
          {errorCount > 0 && (
            <span style={{ color: "#ff1744" }}>
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </span>
          )}
          {warningCount > 0 && (
            <span style={{ color: "#ffab00" }}>
              {warningCount} warning{warningCount !== 1 ? "s" : ""}
            </span>
          )}
          {errorCount === 0 && warningCount === 0 && (
            <span style={{ color: "#00e676" }}>valid</span>
          )}
        </div>
      </div>

      {/* Editor */}
      <textarea
        value={value}
        onChange={handleChange}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        style={{
          flex: 1,
          background: "transparent",
          color: "#e0f7fa",
          border: "none",
          outline: "none",
          resize: "none",
          padding: "16px",
          fontSize: 13,
          lineHeight: 1.6,
          tabSize: 2,
          fontFamily: "inherit",
          caretColor: "#00e5ff",
        }}
      />

      {/* Error panel */}
      {errors.length > 0 && (
        <div
          style={{
            maxHeight: 120,
            overflowY: "auto",
            borderTop: "1px solid rgba(0,229,255,0.12)",
            padding: "8px 16px",
            fontSize: 11,
          }}
        >
          {errors.map((err, i) => (
            <div
              key={i}
              style={{
                color: err.severity === "error" ? "#ff1744" : "#ffab00",
                marginBottom: 4,
              }}
            >
              <span style={{ opacity: 0.6 }}>{err.path || "root"}</span>{" "}
              {err.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
