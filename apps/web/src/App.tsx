import React, { useState, useMemo, useCallback } from "react";
import { parse, layout } from "@homelab-stackdoc/core";
import type { PositionedGraph, ValidationError, Device } from "@homelab-stackdoc/core";
import { YamlEditor } from "./components/YamlEditor";
import { PreviewPane } from "./components/PreviewPane";
import { SAMPLE_YAML } from "./sampleYaml";

/** Recursively collects all devices (including children) into a flat map */
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

export const App: React.FC = () => {
  const [yaml, setYaml] = useState(SAMPLE_YAML);
  const [splitRatio, setSplitRatio] = useState(0.15);
  const [resizing, setResizing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Core pipeline: parse → validate → layout
  const { graph, errors, deviceMap } = useMemo<{
    graph: PositionedGraph | null;
    errors: ValidationError[];
    deviceMap: Map<string, Device>;
  }>(() => {
    const result = parse(yaml);
    if (!result.ok) {
      return { graph: null, errors: result.errors, deviceMap: new Map() };
    }
    try {
      const positioned = layout(result.document, { expanded });
      const dMap = buildDeviceMap(result.document.devices);
      return { graph: positioned, errors: result.warnings, deviceMap: dMap };
    } catch (e) {
      return {
        graph: null,
        errors: [
          {
            path: "",
            message: `Layout error: ${e instanceof Error ? e.message : String(e)}`,
            severity: "error" as const,
          },
        ],
        deviceMap: new Map(),
      };
    }
  }, [yaml, expanded]);

  // Split-pane resizer
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
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "#080f1e",
      }}
    >
      <div style={{ width: `${splitRatio * 100}%`, height: "100%" }}>
        <YamlEditor value={yaml} onChange={setYaml} errors={errors} />
      </div>

      <div
        onMouseDown={onResizeStart}
        style={{
          width: 5,
          cursor: "col-resize",
          background: resizing
            ? "rgba(0,229,255,0.3)"
            : "rgba(0,229,255,0.08)",
          transition: "background 0.15s",
          flexShrink: 0,
        }}
      />

      <div style={{ flex: 1, height: "100%" }}>
        <PreviewPane
          graph={graph}
          errors={errors}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          deviceMap={deviceMap}
        />
      </div>
    </div>
  );
};
