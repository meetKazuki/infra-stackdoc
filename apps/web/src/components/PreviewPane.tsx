import html2canvas from "html2canvas";
import React, { useRef, useState, useCallback } from "react";
import { SharePanel } from "./SharePanel";
import { TopologyCanvas } from "@homelab-stackdoc/renderer";
import type { PositionedGraph, ValidationError, Device, Connection } from "@homelab-stackdoc/core";

interface PreviewPaneProps {
  graph: PositionedGraph | null;
  errors: ValidationError[];
  deviceMap: Map<string, Device>;
  connections: Connection[];
  yaml: string;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  graph,
  errors,
  deviceMap,
  connections,
  yaml,
}) => {
  const captureRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPng = useCallback(async () => {
    if (!captureRef.current || !graph) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#080f1e",
        scale: 2,
        useCORS: true,
        logging: false,
        width: captureRef.current.offsetWidth,
        height: captureRef.current.offsetHeight,
      });
      const link = document.createElement("a");
      link.download = `homelab-topology-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("PNG export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [graph]);

  if (errors.some((e) => e.severity === "error") || !graph) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", background: "#080f1e",
        fontFamily: "'JetBrains Mono', monospace",
        color: "#455a64", fontSize: 13, textAlign: "center", padding: 40,
      }}>
        <div>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          <div>Fix the YAML errors to see the topology preview.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div ref={captureRef} style={{ height: "100%" }}>
        <TopologyCanvas
          graph={graph}
          deviceMap={deviceMap}
          connections={connections}
        />
      </div>
      <SharePanel
        yaml={yaml}
        onExportPng={handleExportPng}
        isExporting={isExporting}
      />
    </div>
  );
};
