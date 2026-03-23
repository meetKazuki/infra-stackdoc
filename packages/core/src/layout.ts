import { DEFAULT_LAYOUT_OPTIONS } from "./types";
import type {
  HomelabDocument,
  Device,
  Connection,
  PositionedGraph,
  PositionedNode,
  PositionedEdge,
  PositionedGroup,
  LayoutOptions,
  Point,
} from "./types";

/**
 * Computes positions for top-level devices only.
 * Children are rendered inline inside their parent's card,
 * not as separate graph nodes.
 */
export function layout(
  doc: HomelabDocument,
  userOptions?: LayoutOptions,
): PositionedGraph {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...userOptions };

  // 1. Top-level devices only (strip children for layout purposes)
  const topLevel = doc.devices.map((d): Device => ({ ...d, children: undefined }));

  // 2. Build connection-based hierarchy for depth assignment
  const { childrenMap, roots } = buildHierarchy(topLevel, doc.connections ?? []);

  // 3. BFS depth
  const depthMap = assignDepths(roots, childrenMap);

  // 4. Build layers
  const layers = buildLayers(topLevel, depthMap);

  // 5. Position nodes — estimate height based on content
  const nodeMap = positionLayers(layers, doc.devices, opts);

  // 6. Reroute connections targeting children to their parent
  const rerouteMap = buildRerouteMap(doc.devices);
  const visibleIds = new Set(topLevel.map((d) => d.id));
  const rerouted = rerouteConnections(doc.connections ?? [], rerouteMap, visibleIds);

  // 7. Group outlines
  const groups = positionGroups(doc.groups ?? [], topLevel, nodeMap, opts);

  // 8. Normalize to positive coordinates
  normalizePositions(nodeMap, groups, opts.groupPadding);

  // 9. Route edges
  const edges = routeEdges(rerouted, nodeMap);

  // 10. Bounds
  const bounds = computeBounds(nodeMap, groups, opts);

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    groups,
    bounds,
    meta: doc.meta,
  };
}

// ─── Hierarchy ────────────────────────────────────────────────────

function buildHierarchy(
  devices: Device[],
  connections: Connection[],
): {
  parentMap: Map<string, string>;
  childrenMap: Map<string, string[]>;
  roots: string[];
} {
  const ids = new Set(devices.map((d) => d.id));
  const parentMap = new Map<string, string>();
  const childrenMap = new Map<string, string[]>();

  for (const conn of connections) {
    if (!ids.has(conn.from) || !ids.has(conn.to)) continue;
    if (!parentMap.has(conn.to)) {
      parentMap.set(conn.to, conn.from);
    }
    const existing = childrenMap.get(conn.from) ?? [];
    if (!existing.includes(conn.to)) {
      existing.push(conn.to);
      childrenMap.set(conn.from, existing);
    }
  }

  const roots = devices
    .filter((d) => !parentMap.has(d.id))
    .map((d) => d.id);

  return { parentMap, childrenMap, roots };
}

function assignDepths(
  roots: string[],
  childrenMap: Map<string, string[]>,
): Map<string, number> {
  const depthMap = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = roots.map((id) => ({
    id,
    depth: 0,
  }));

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depthMap.has(id)) continue;
    depthMap.set(id, depth);
    for (const childId of childrenMap.get(id) ?? []) {
      if (!depthMap.has(childId)) {
        queue.push({ id: childId, depth: depth + 1 });
      }
    }
  }

  return depthMap;
}

function buildLayers(
  devices: Device[],
  depthMap: Map<string, number>,
): Device[][] {
  const maxDepth = Math.max(0, ...depthMap.values());
  const layers: Device[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const d of devices) {
    const depth = depthMap.get(d.id) ?? 0;
    layers[depth].push(d);
  }
  return layers;
}

// ─── Node positioning ─────────────────────────────────────────────

/**
 * @deprecated
 * Estimates card height based on content: tags, specs, children.
 */
function estimateNodeHeight(
  device: Device,
  originalDevices: Device[],
  baseHeight: number,
): number {
  const orig = originalDevices.find((d) => d.id === device.id);
  let h = 40;

  const tags = orig?.tags ?? [];
  if (tags.length > 0) h += 18;

  const specs = orig?.specs
    ? Object.values(orig.specs).filter(Boolean).length
    : 0;
  if (specs > 0) h += 18;

  const children = orig?.children ?? [];
  if (children.length > 0) h += 36;

  return h;
}

function positionLayers(
  layers: Device[][],
  originalDevices: Device[],
  opts: Required<LayoutOptions>,
): Map<string, PositionedNode> {
  const nodeMap = new Map<string, PositionedNode>();
  let currentY = 0;

  for (let depth = 0; depth < layers.length; depth++) {
    const layer = layers[depth];
    const layerWidth =
      layer.length * opts.nodeWidth +
      (layer.length - 1) * opts.horizontalSpacing;
    const startX = -layerWidth / 2;

    for (let i = 0; i < layer.length; i++) {
      const device = layer[i];
      nodeMap.set(device.id, {
        device,
        x: startX + i * (opts.nodeWidth + opts.horizontalSpacing),
        y: currentY,
        width: opts.nodeWidth,
        height: opts.nodeHeight,
        depth,
      });
    }

    currentY += opts.nodeHeight + opts.verticalSpacing;
  }

  return nodeMap;
}

// ─── Connection rerouting ─────────────────────────────────────────

/**
 * Maps every nested child/grandchild id to its top-level ancestor.
 * Since children are rendered inline, connections to them
 * terminate at the parent.
 */
function buildRerouteMap(devices: Device[]): Map<string, string> {
  const map = new Map<string, string>();

  const mapDescendants = (children: Device[], target: string) => {
    for (const child of children) {
      map.set(child.id, target);
      if (child.children) mapDescendants(child.children, target);
    }
  };

  for (const d of devices) {
    if (d.children) mapDescendants(d.children, d.id);
  }

  return map;
}

function rerouteConnections(
  connections: Connection[],
  rerouteMap: Map<string, string>,
  visibleIds: Set<string>,
): Connection[] {
  const seen = new Set<string>();
  const result: Connection[] = [];

  for (const conn of connections) {
    const from = rerouteMap.get(conn.from) ?? conn.from;
    const to = rerouteMap.get(conn.to) ?? conn.to;

    if (!visibleIds.has(from) || !visibleIds.has(to)) continue;
    if (from === to) continue;

    const key = `${from}→${to}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({ ...conn, from, to });
  }

  return result;
}

// ─── Edge routing ─────────────────────────────────────────────────

function routeEdges(
  connections: Connection[],
  nodeMap: Map<string, PositionedNode>,
): PositionedEdge[] {
  const bySource = new Map<string, Connection[]>();
  for (const conn of connections) {
    const list = bySource.get(conn.from) ?? [];
    list.push(conn);
    bySource.set(conn.from, list);
  }

  const byTarget = new Map<string, Connection[]>();
  for (const conn of connections) {
    const list = byTarget.get(conn.to) ?? [];
    list.push(conn);
    byTarget.set(conn.to, list);
  }

  const channelSpacing = 12;

  return connections
    .map((conn) => {
      const fromNode = nodeMap.get(conn.from);
      const toNode = nodeMap.get(conn.to);
      if (!fromNode || !toNode) return null;

      const siblings = bySource.get(conn.from) ?? [conn];
      const sibIndex = siblings.indexOf(conn);
      const sibCount = siblings.length;
      const exitSpread = Math.min(fromNode.width * 0.7, sibCount * 24);
      const exitStartX = fromNode.x + fromNode.width / 2 - exitSpread / 2;
      const exitX =
        sibCount === 1
          ? fromNode.x + fromNode.width / 2
          : exitStartX + (sibIndex / (sibCount - 1)) * exitSpread;

      const targetSiblings = byTarget.get(conn.to) ?? [conn];
      const targetIndex = targetSiblings.indexOf(conn);
      const targetCount = targetSiblings.length;
      const entrySpread = Math.min(toNode.width * 0.7, targetCount * 24);
      const entryStartX = toNode.x + toNode.width / 2 - entrySpread / 2;
      const entryX =
        targetCount === 1
          ? toNode.x + toNode.width / 2
          : entryStartX + (targetIndex / (targetCount - 1)) * entrySpread;

      const fromPt: Point = { x: exitX, y: fromNode.y + fromNode.height };
      const toPt: Point = { x: entryX, y: toNode.y };

      const midBase = (fromPt.y + toPt.y) / 2;
      const channelOffset =
        sibCount <= 1
          ? 0
          : (sibIndex - (sibCount - 1) / 2) * channelSpacing;
      const midY = midBase + channelOffset;

      const isAligned = Math.abs(fromPt.x - toPt.x) < 4;
      const points: Point[] = isAligned
        ? [fromPt, toPt]
        : [fromPt, { x: fromPt.x, y: midY }, { x: toPt.x, y: midY }, toPt];

      return {
        connection: conn,
        points,
        fromNodeId: conn.from,
        toNodeId: conn.to,
      };
    })
    .filter(Boolean) as PositionedEdge[];
}

// ─── Groups ───────────────────────────────────────────────────────

function positionGroups(
  groups: HomelabDocument["groups"],
  devices: Device[],
  nodeMap: Map<string, PositionedNode>,
  opts: Required<LayoutOptions>,
): PositionedGroup[] {
  if (!groups) return [];

  return groups
    .map((group) => {
      const members = devices.filter((d) => d.group === group.id);
      if (members.length === 0) return null;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      for (const m of members) {
        const node = nodeMap.get(m.id);
        if (!node) continue;
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      }

      if (!isFinite(minX)) return null;

      const pad = opts.groupPadding;
      return {
        group,
        x: minX - pad,
        y: minY - pad,
        width: maxX - minX + pad * 2,
        height: maxY - minY + pad * 2,
      };
    })
    .filter(Boolean) as PositionedGroup[];
}

// ─── Normalization & bounds ───────────────────────────────────────

function normalizePositions(
  nodeMap: Map<string, PositionedNode>,
  groups: PositionedGroup[],
  padding: number,
): void {
  let minX = Infinity;
  let minY = Infinity;

  for (const node of nodeMap.values()) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
  }
  for (const g of groups) {
    minX = Math.min(minX, g.x);
    minY = Math.min(minY, g.y);
  }

  const shiftX = -minX + padding;
  const shiftY = -minY + padding;

  for (const node of nodeMap.values()) {
    node.x += shiftX;
    node.y += shiftY;
  }
  for (const g of groups) {
    g.x += shiftX;
    g.y += shiftY;
  }
}

function computeBounds(
  nodeMap: Map<string, PositionedNode>,
  groups: PositionedGroup[],
  opts: Required<LayoutOptions>,
): { width: number; height: number } {
  let maxX = 0;
  let maxY = 0;

  for (const node of nodeMap.values()) {
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  for (const g of groups) {
    maxX = Math.max(maxX, g.x + g.width);
    maxY = Math.max(maxY, g.y + g.height);
  }

  const pad = opts.groupPadding * 2;
  return { width: maxX + pad, height: maxY + pad };
}
