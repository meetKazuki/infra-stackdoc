import React, { useState, useMemo, useCallback } from "react";
import { parse, layout } from "@homelab-stackdoc/core";
import { PreviewPane } from "./components/PreviewPane";
import { SAMPLE_YAML } from "./sampleYaml";
import { YamlEditor } from "./components/YamlEditor";
import type { PositionedGraph, ValidationError, Device } from "@homelab-stackdoc/core";

function buildDeviceMap(devices: Device[]): Map<string, Device> {
  const map = new Map<string, Device>();
  const walk = (devs: Device[]) => {
    for (const d of devs) {
      map.set(d.id, d);
      if (d.children) walk(d.children);
    }
  };
  walk(devices);
  return map;
}

const toggleButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: 52,
  left: 8,
  zIndex: 20,
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(12, 21, 39, 0.9)",
  border: "1px solid rgba(0, 229, 255, 0.12)",
  borderRadius: 6,
  color: "#78909c",
  cursor: "pointer",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 14,
  padding: 0,
  transition: "all 0.15s",
};

export const App: React.FC = () => {
  const [yaml, setYaml] = useState(SAMPLE_YAML);
  const [splitRatio, setSplitRatio] = useState(0.25);
  const [resizing, setResizing] = useState(false);
  const [editorVisible, setEditorVisible] = useState(true);

  const { graph, errors, deviceMap, connections } = useMemo(() => {
    const result = parse(yaml);
    if (!result.ok) {
      return { graph: null, errors: result.errors, deviceMap: new Map(), connections: [] };
    }
    try {
      const positioned = layout(result.document);
      const dMap = buildDeviceMap(result.document.devices);
      return {
        graph: positioned,
        errors: result.warnings,
        deviceMap: dMap,
        connections: result.document.connections ?? [],
      };
    } catch (e) {
      return {
        graph: null,
        errors: [{
          path: "",
          message: `Layout error: ${e instanceof Error ? e.message : String(e)}`,
          severity: "error" as const,
        }],
        deviceMap: new Map(),
        connections: [],
      };
    }
  }, [yaml]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const onMove = (moveEvent: MouseEvent) => {
      const ratio = moveEvent.clientX / window.innerWidth;
      setSplitRatio(Math.min(0.6, Math.max(0.15, ratio)));
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100vw",
      overflow: "hidden", background: "#080f1e",
    }}>
      {/* Editor pane */}
      {editorVisible && (
        <>
          <div style={{ width: `${splitRatio * 100}%`, height: "100%" }}>
            <YamlEditor value={yaml} onChange={setYaml} errors={errors} />
          </div>
          <div
            onMouseDown={onResizeStart}
            style={{
              width: 5, cursor: "col-resize", flexShrink: 0,
              background: resizing ? "rgba(0,229,255,0.3)" : "rgba(0,229,255,0.08)",
              transition: "background 0.15s",
            }}
          />
        </>
      )}

      {/* Canvas pane */}
      <div style={{ flex: 1, height: "100%", position: "relative" }}>
        {/* Editor toggle button */}
        <button
          onClick={() => setEditorVisible((v) => !v)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.35)";
            e.currentTarget.style.color = "#00e5ff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.12)";
            e.currentTarget.style.color = "#78909c";
          }}
          title={editorVisible ? "Hide editor" : "Show editor"}
          style={toggleButtonStyle}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
            {editorVisible ? (
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            ) : (
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            )}
          </svg>
        </button>

        <PreviewPane
          graph={graph}
          errors={errors}
          deviceMap={deviceMap}
          connections={connections}
          yaml={yaml}
        />
      </div>
    </div>
  );
};
