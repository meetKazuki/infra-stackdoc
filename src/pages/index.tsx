import { useState, useEffect, useCallback, useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, GripVertical } from "lucide-react";
import YamlEditor from "@components/editor/yaml-editor";
import TopologyCanvas from "@components/canvas/topology-canvas";
import { processYAMLTopology } from "@core/validator";
import { DEFAULT_YAML } from "@data/default-topology";

export default function Index() {
  const [yamlString, setYamlString] = useState(DEFAULT_YAML);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [splitPercent, setSplitPercent] = useState(30);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const result = await processYAMLTopology(yamlString);

      if (cancelled) return;

      if ("error" in result && result.error) {
        setIsValid(false);
        setErrorMsg(result.error);
      } else if (result.nodes && result.edges) {
        setNodes(result.nodes);
        setEdges(result.edges);
        setIsValid(true);
        setErrorMsg("");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [yamlString]);

  const handleMouseDown = useCallback(() => setIsDragging(true), []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const pct = (e.clientX / window.innerWidth) * 100;
      setSplitPercent(Math.min(60, Math.max(15, pct)));
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const statusIndicator = useMemo(
    () => (
      <AnimatePresence mode="wait">
        <motion.div
          key={isValid ? "valid" : "invalid"}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 4 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-1.5"
        >
          {isValid ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-green" />
              <span className="text-[11px] font-mono text-green">VALID</span>
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[11px] font-mono text-destructive truncate max-w-[180px]">
                {errorMsg || "ERROR"}
              </span>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    ),
    [isValid, errorMsg],
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background select-none">
      {/* Left Pane - Editor */}
      <div className="flex flex-col" style={{ width: `${splitPercent}%` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan animate-pulse-glow" />
            <h1 className="text-sm font-bold font-mono text-foreground tracking-wide">
              HOMELAB BUILDER
            </h1>
          </div>
          {statusIndicator}
        </div>
        {/* Editor */}
        <div className="flex-1 min-h-0">
          <YamlEditor value={yamlString} onChange={setYamlString} />
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-1 cursor-col-resize flex items-center justify-center bg-border hover:bg-primary/30 transition-colors ${isDragging ? "bg-primary/40" : ""}`}
      >
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </div>

      {/* Right Pane - Canvas */}
      <div className="flex-1 min-w-0">
        <TopologyCanvas nodes={nodes} edges={edges} />
      </div>
    </div>
  );
}
