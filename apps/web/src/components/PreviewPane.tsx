import React from "react";
import type { PositionedGraph, ValidationError, Device } from "@homelab-stackdoc/core";
import { TopologyCanvas } from "@homelab-stackdoc/renderer";

interface PreviewPaneProps {
  graph: PositionedGraph | null;
  errors: ValidationError[];
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  deviceMap: Map<string, Device>;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  graph,
  errors,
  expanded,
  onToggleExpand,
  deviceMap,
}) => {
  if (errors.some((e) => e.severity === "error") || !graph) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          background: "#080f1e",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          color: "#455a64",
          fontSize: 13,
          textAlign: "center",
          padding: 40,
        }}
      >
        <div>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          <div>Fix the YAML errors to see the topology preview.</div>
        </div>
      </div>
    );
  }

  return (
    <TopologyCanvas
      graph={graph}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
      deviceMap={deviceMap}
    />
  );
};
