import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { motion } from "framer-motion";

const tierColors: Record<
  string,
  { border: string; bg: string; text: string; glow: string }
> = {
  edge: {
    border: "border-cyan",
    bg: "bg-cyan/10",
    text: "text-cyan",
    glow: "glow-cyan",
  },
  core: {
    border: "border-purple",
    bg: "bg-purple/10",
    text: "text-purple",
    glow: "glow-purple",
  },
  compute: {
    border: "border-green",
    bg: "bg-green/10",
    text: "text-green",
    glow: "glow-green",
  },
  iot: {
    border: "border-yellow",
    bg: "bg-yellow/10",
    text: "text-yellow",
    glow: "glow-yellow",
  },
  storage: {
    border: "border-cyan",
    bg: "bg-cyan/10",
    text: "text-cyan",
    glow: "glow-cyan",
  },
};

const DeviceNode = memo(({ data }: NodeProps) => {
  const tier = (data.tier as string) || "core";
  const colors = tierColors[tier] || tierColors.core;
  const hardware = data.hardware as Record<string, string> | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={`relative h-full rounded-lg border ${colors.border} ${colors.glow} bg-card p-4 font-mono`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-muted-foreground !w-2 !h-2"
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">
            {data.label as string}
          </h3>
          {data.ip && (
            <p className="text-xs text-muted-foreground">{data.ip as string}</p>
          )}
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${colors.bg} ${colors.text}`}
        >
          {tier}
        </span>
      </div>

      {/* Platform */}
      {data.platform && (
        <p className="text-[10px] text-muted-foreground/60 mb-2">
          {data.platform as string}
        </p>
      )}

      {/* Hardware specs - shown at reduced opacity */}
      {hardware && Object.keys(hardware).length > 0 && (
        <div className="absolute bottom-3 left-4 right-4 flex flex-wrap gap-1.5 opacity-50 hover:opacity-100 transition-opacity duration-150">
          {hardware.cpu && (
            <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
              {hardware.cpu}
            </span>
          )}
          {hardware.ram && (
            <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
              {hardware.ram}
            </span>
          )}
          {hardware.storage && (
            <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
              {hardware.storage}
            </span>
          )}
          {hardware.gpu && (
            <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
              {hardware.gpu}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
});

DeviceNode.displayName = "DeviceNode";

export default DeviceNode;
