import { assignPorts, getPortX } from './ports'
import {
  DEFAULT_LAYOUT_OPTIONS,
  type HomelabDocument,
  type Device,
  type Connection,
  type PositionedGraph,
  type PositionedNode,
  type PositionedEdge,
  type PositionedGroup,
  type LayoutOptions,
  type Point,
} from './types'
import type { PortAssignment } from './ports'

export function layout(doc: HomelabDocument, userOptions?: LayoutOptions): PositionedGraph {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...userOptions }

  // 1. Top-level devices only
  const topLevel = doc.devices.map((d): Device => ({ ...d, children: undefined }))

  // 2. Connection hierarchy for depth
  const { childrenMap, roots } = buildHierarchy(topLevel, doc.connections ?? [])

  // 3. BFS depth
  const depthMap = assignDepths(roots, childrenMap)

  // 4. Layers
  const layers = buildLayers(topLevel, depthMap)

  // 5. Position nodes
  const nodeMap = positionLayers(layers, opts)

  // 6. Reroute connections targeting children
  const rerouteMap = buildRerouteMap(doc.devices)
  const visibleIds = new Set(topLevel.map((d) => d.id))
  const rerouted = rerouteConnections(doc.connections ?? [], rerouteMap, visibleIds)

  // 7. Assign ports using original devices (for interface info) and rerouted connections
  const portAssignments = assignPorts(doc.devices, rerouted)

  // 8. Group outlines
  const groups = positionGroups(doc.groups ?? [], topLevel, nodeMap, opts)

  // 9. Normalize
  normalizePositions(nodeMap, groups, opts.groupPadding)

  // 10. Route edges (port-aware)
  const edges = routeEdges(rerouted, nodeMap, doc.devices, portAssignments)

  // 11. Bounds
  const bounds = computeBounds(nodeMap, groups, opts)

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    groups,
    bounds,
    meta: doc.meta,
    portAssignments,
  }
}

// ─── Hierarchy ────────────────────────────────────────────────────

function buildHierarchy(
  devices: Device[],
  connections: Connection[],
): {
  parentMap: Map<string, string>
  childrenMap: Map<string, string[]>
  roots: string[]
} {
  const ids = new Set(devices.map((d) => d.id))
  const parentMap = new Map<string, string>()
  const childrenMap = new Map<string, string[]>()

  for (const conn of connections) {
    if (!ids.has(conn.from) || !ids.has(conn.to)) continue
    if (!parentMap.has(conn.to)) {
      parentMap.set(conn.to, conn.from)
    }
    const existing = childrenMap.get(conn.from) ?? []
    if (!existing.includes(conn.to)) {
      existing.push(conn.to)
      childrenMap.set(conn.from, existing)
    }
  }

  const roots = devices.filter((d) => !parentMap.has(d.id)).map((d) => d.id)

  return { parentMap, childrenMap, roots }
}

function assignDepths(roots: string[], childrenMap: Map<string, string[]>): Map<string, number> {
  const depthMap = new Map<string, number>()
  const queue: Array<{ id: string; depth: number }> = roots.map((id) => ({
    id,
    depth: 0,
  }))

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (depthMap.has(id)) continue
    depthMap.set(id, depth)
    for (const childId of childrenMap.get(id) ?? []) {
      if (!depthMap.has(childId)) {
        queue.push({ id: childId, depth: depth + 1 })
      }
    }
  }

  return depthMap
}

function buildLayers(devices: Device[], depthMap: Map<string, number>): Device[][] {
  const maxDepth = Math.max(0, ...depthMap.values())
  const layers: Device[][] = Array.from({ length: maxDepth + 1 }, () => [])
  for (const d of devices) {
    const depth = depthMap.get(d.id) ?? 0
    layers[depth].push(d)
  }
  return layers
}

// ─── Node positioning ─────────────────────────────────────────────

function positionLayers(
  layers: Device[][],
  opts: Required<LayoutOptions>,
): Map<string, PositionedNode> {
  const nodeMap = new Map<string, PositionedNode>()
  const groupGap = opts.groupPadding * 2 + 16

  let currentY = 0

  for (let depth = 0; depth < layers.length; depth++) {
    const layer = layers[depth]

    const gaps: number[] = []
    for (let i = 1; i < layer.length; i++) {
      const prevGroup = layer[i - 1].group ?? ''
      const currGroup = layer[i].group ?? ''
      const sameGroup = prevGroup !== '' && currGroup !== '' && prevGroup === currGroup
      gaps.push(sameGroup ? opts.horizontalSpacing : Math.max(opts.horizontalSpacing, groupGap))
    }

    const totalGaps = gaps.reduce((sum, g) => sum + g, 0)
    const layerWidth = layer.length * opts.nodeWidth + totalGaps
    let cursorX = -layerWidth / 2

    for (let i = 0; i < layer.length; i++) {
      const device = layer[i]

      nodeMap.set(device.id, {
        device,
        x: cursorX,
        y: currentY,
        width: opts.nodeWidth,
        height: opts.nodeHeight,
        depth,
      })

      cursorX += opts.nodeWidth
      if (i < gaps.length) {
        cursorX += gaps[i]
      }
    }

    currentY += opts.nodeHeight + opts.verticalSpacing
  }

  return nodeMap
}

// ─── Connection rerouting ─────────────────────────────────────────

function buildRerouteMap(devices: Device[]): Map<string, string> {
  const map = new Map<string, string>()
  const mapDescendants = (children: Device[], target: string) => {
    for (const child of children) {
      map.set(child.id, target)
      if (child.children) mapDescendants(child.children, target)
    }
  }
  for (const d of devices) {
    if (d.children) mapDescendants(d.children, d.id)
  }
  return map
}

function rerouteConnections(
  connections: Connection[],
  rerouteMap: Map<string, string>,
  visibleIds: Set<string>,
): Connection[] {
  const seen = new Set<string>()
  const result: Connection[] = []

  for (const conn of connections) {
    const from = rerouteMap.get(conn.from) ?? conn.from
    const to = rerouteMap.get(conn.to) ?? conn.to

    if (!visibleIds.has(from) || !visibleIds.has(to)) continue
    if (from === to) continue

    const key = `${from}→${to}`
    if (seen.has(key)) continue
    seen.add(key)

    result.push({ ...conn, from, to })
  }

  return result
}

// ─── Edge routing (port-aware) ────────────────────────────────────

function routeEdges(
  connections: Connection[],
  nodeMap: Map<string, PositionedNode>,
  originalDevices: Device[],
  portAssignments: Map<string, PortAssignment[]>,
): PositionedEdge[] {
  // Build a lookup for original devices (with interfaces)
  const deviceLookup = new Map<string, Device>()
  const walkDevices = (devs: Device[]) => {
    for (const d of devs) {
      deviceLookup.set(d.id, d)
      if (d.children) walkDevices(d.children)
    }
  }
  walkDevices(originalDevices)

  // For channel routing: group by gap
  interface EdgeInfo {
    connection: Connection
    fromNode: PositionedNode
    toNode: PositionedNode
    exitX: number
    exitY: number
    entryX: number
    entryY: number
    gapKey: string
    fromPortIndex?: number
    toPortIndex?: number
  }

  const edgeInfos: EdgeInfo[] = []

  // Default fan-out tracking
  const bySource = new Map<string, Connection[]>()
  const byTarget = new Map<string, Connection[]>()
  for (const conn of connections) {
    if (!nodeMap.has(conn.from) || !nodeMap.has(conn.to)) continue
    const sf = bySource.get(conn.from) ?? []
    sf.push(conn)
    bySource.set(conn.from, sf)
    const tf = byTarget.get(conn.to) ?? []
    tf.push(conn)
    byTarget.set(conn.to, tf)
  }

  for (const conn of connections) {
    const fromNode = nodeMap.get(conn.from)
    const toNode = nodeMap.get(conn.to)
    if (!fromNode || !toNode) continue

    const fromDevice = deviceLookup.get(conn.from)
    const toDevice = deviceLookup.get(conn.to)

    // Find port assignments for this connection
    const fromPorts = portAssignments.get(conn.from) ?? []
    const toPorts = portAssignments.get(conn.to) ?? []
    const fromPort = fromPorts.find((p) => p.connectedTo === conn.to && p.interfaceType !== 'wifi')
    const toPort = toPorts.find((p) => p.connectedTo === conn.from && p.interfaceType !== 'wifi')

    let exitX: number
    let entryX: number

    // Compute exit X: port-level or fan-spread fallback
    if (fromPort && fromDevice?.interfaces) {
      const iface =
        fromDevice.interfaces[fromPort.interfaceType as keyof typeof fromDevice.interfaces]
      const totalPorts = iface && 'count' in iface ? iface.count : 1
      exitX = fromNode.x + getPortX(fromPort.portIndex, totalPorts, fromNode.width)
    } else {
      // Fan-spread fallback
      const siblings = bySource.get(conn.from) ?? [conn]
      const sibIndex = siblings.indexOf(conn)
      const sibCount = siblings.length
      const spread = Math.min(fromNode.width * 0.6, sibCount * 20)
      const center = fromNode.x + fromNode.width / 2
      exitX = sibCount === 1 ? center : center - spread / 2 + (sibIndex / (sibCount - 1)) * spread
    }

    // Compute entry X: port-level or fan-spread fallback
    if (toPort && toDevice?.interfaces) {
      const iface = toDevice.interfaces[toPort.interfaceType as keyof typeof toDevice.interfaces]
      const totalPorts = iface && 'count' in iface ? iface.count : 1
      entryX = toNode.x + getPortX(toPort.portIndex, totalPorts, toNode.width)
    } else {
      const targetSiblings = byTarget.get(conn.to) ?? [conn]
      const targetIndex = targetSiblings.indexOf(conn)
      const targetCount = targetSiblings.length
      const spread = Math.min(toNode.width * 0.6, targetCount * 20)
      const center = toNode.x + toNode.width / 2
      entryX =
        targetCount === 1
          ? center
          : center - spread / 2 + (targetIndex / (targetCount - 1)) * spread
    }

    const exitY = fromNode.y + fromNode.height
    const entryY = toNode.y
    const gapKey = `${fromNode.depth}→${toNode.depth}`

    edgeInfos.push({
      connection: conn,
      fromNode,
      toNode,
      exitX,
      exitY,
      entryX,
      entryY,
      gapKey,
      fromPortIndex: fromPort?.portIndex,
      toPortIndex: toPort?.portIndex,
    })
  }

  // Assign channels per gap
  const gapGroups = new Map<string, EdgeInfo[]>()
  for (const info of edgeInfos) {
    const list = gapGroups.get(info.gapKey) ?? []
    list.push(info)
    gapGroups.set(info.gapKey, list)
  }

  const channelMap = new Map<EdgeInfo, number>()

  for (const [, group] of gapGroups) {
    if (group.length === 0) continue

    const sorted = [...group].sort((a, b) => a.entryX - b.entryX)
    const gapTop = Math.min(...sorted.map((e) => e.exitY))
    const gapBottom = Math.max(...sorted.map((e) => e.entryY))

    const margin = 15
    const usableTop = gapTop + margin
    const usableBottom = gapBottom - margin
    const usableSpace = usableBottom - usableTop
    const minSpacing = 8
    const count = sorted.length

    if (count === 1) {
      channelMap.set(sorted[0], (usableTop + usableBottom) / 2)
    } else {
      const idealSpacing = usableSpace / (count - 1)
      const spacing = Math.max(minSpacing, idealSpacing)
      const totalNeeded = spacing * (count - 1)
      const startY = usableTop + (usableSpace - totalNeeded) / 2
      for (let i = 0; i < count; i++) {
        channelMap.set(sorted[i], startY + i * spacing)
      }
    }
  }

  // Build paths
  return edgeInfos.map((info) => {
    const channelY = channelMap.get(info)!
    const isAligned = Math.abs(info.exitX - info.entryX) < 6

    let points: Point[]
    if (isAligned) {
      points = [
        { x: info.exitX, y: info.exitY },
        { x: info.entryX, y: info.entryY },
      ]
    } else {
      points = [
        { x: info.exitX, y: info.exitY },
        { x: info.exitX, y: channelY },
        { x: info.entryX, y: channelY },
        { x: info.entryX, y: info.entryY },
      ]
    }

    return {
      connection: info.connection,
      points,
      fromNodeId: info.connection.from,
      toNodeId: info.connection.to,
      fromPortIndex: info.fromPortIndex,
      toPortIndex: info.toPortIndex,
    }
  })
}

// ─── Groups ───────────────────────────────────────────────────────

function positionGroups(
  groups: HomelabDocument['groups'],
  devices: Device[],
  nodeMap: Map<string, PositionedNode>,
  opts: Required<LayoutOptions>,
): PositionedGroup[] {
  if (!groups) return []

  const pad = opts.groupPadding
  const topPad = pad + 16

  return groups
    .map((group) => {
      const members = devices.filter((d) => d.group === group.id)
      if (members.length === 0) return null

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity

      for (const m of members) {
        const node = nodeMap.get(m.id)
        if (!node) continue
        minX = Math.min(minX, node.x)
        minY = Math.min(minY, node.y)
        maxX = Math.max(maxX, node.x + node.width)
        maxY = Math.max(maxY, node.y + node.height)
      }

      if (!isFinite(minX)) return null

      return {
        group,
        x: minX - pad,
        y: minY - topPad,
        width: maxX - minX + pad * 2,
        height: maxY - minY + topPad + pad,
      }
    })
    .filter(Boolean) as PositionedGroup[]
}

// ─── Normalization & bounds ───────────────────────────────────────

function normalizePositions(
  nodeMap: Map<string, PositionedNode>,
  groups: PositionedGroup[],
  padding: number,
): void {
  let minX = Infinity
  let minY = Infinity

  for (const node of nodeMap.values()) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
  }
  for (const g of groups) {
    minX = Math.min(minX, g.x)
    minY = Math.min(minY, g.y)
  }

  const shiftX = -minX + padding
  const shiftY = -minY + padding

  for (const node of nodeMap.values()) {
    node.x += shiftX
    node.y += shiftY
  }
  for (const g of groups) {
    g.x += shiftX
    g.y += shiftY
  }
}

function computeBounds(
  nodeMap: Map<string, PositionedNode>,
  groups: PositionedGroup[],
  opts: Required<LayoutOptions>,
): { width: number; height: number } {
  let maxX = 0
  let maxY = 0

  for (const node of nodeMap.values()) {
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  }

  for (const g of groups) {
    maxX = Math.max(maxX, g.x + g.width)
    maxY = Math.max(maxY, g.y + g.height)
  }

  const pad = opts.groupPadding * 2
  return { width: maxX + pad, height: maxY + pad }
}
