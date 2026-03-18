import { useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ComputeNode from "../nodes/compute-node";
import DeviceNode from "../nodes/device-node";

interface TopologyCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

export default function TopologyCanvas({ nodes, edges }: TopologyCanvasProps) {
  const nodeTypes = useMemo(
    () => ({
      device: DeviceNode,
      compute: ComputeNode,
    }),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="bg-background"
    >
      <Background color="hsl(215 25% 20%)" gap={20} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
