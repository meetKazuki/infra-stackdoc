import { describe, it, expect } from 'vitest'
import { layout } from '../src/layout'
import { DEFAULT_LAYOUT_OPTIONS } from '../src/types'
import type { HomelabDocument, PositionedGraph } from '../src/types'
import { buildDoc, buildDevice, buildConnection, buildDocWithChildren } from './fixtures'

// ─── Helpers ──────────────────────────────────────────────────────

/** Shortcut to find a positioned node by device id. */
function findNode(graph: PositionedGraph, id: string) {
  return graph.nodes.find((n) => n.device.id === id)
}

/** Shortcut to find an edge by its from→to pair. */
function findEdge(graph: PositionedGraph, from: string, to: string) {
  return graph.edges.find((e) => e.fromNodeId === from && e.toNodeId === to)
}

// ─── Basic positioning ────────────────────────────────────────────

describe('layout › basic positioning', () => {
  it('places a single device as one node with default dimensions', () => {
    const doc = buildDoc()

    const graph = layout(doc)

    expect(graph.nodes).toHaveLength(1)
    const node = graph.nodes[0]
    expect(node.device.id).toBe('router')
    expect(node.width).toBe(DEFAULT_LAYOUT_OPTIONS.nodeWidth)
    expect(node.height).toBe(DEFAULT_LAYOUT_OPTIONS.nodeHeight)
    expect(node.depth).toBe(0)
  })

  it('positions multiple unconnected devices in the same layer (depth 0)', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({ id: 'a', name: 'A' }),
        buildDevice({ id: 'b', name: 'B' }),
        buildDevice({ id: 'c', name: 'C' }),
      ],
    })

    const graph = layout(doc)

    expect(graph.nodes).toHaveLength(3)

    // All nodes should share the same y and depth since there are no connections.
    const ys = graph.nodes.map((n) => n.y)
    expect(new Set(ys).size).toBe(1)

    const depths = graph.nodes.map((n) => n.depth)
    expect(depths).toEqual([0, 0, 0])

    // Nodes should be sorted left-to-right with increasing x.
    const xs = graph.nodes.map((n) => n.x)
    expect(xs[0]).toBeLessThan(xs[1])
    expect(xs[1]).toBeLessThan(xs[2])
  })

  it('layers connected devices at increasing depth', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({ id: 'a', name: 'Root' }),
        buildDevice({ id: 'b', name: 'Mid' }),
        buildDevice({ id: 'c', name: 'Leaf' }),
      ],
      connections: [
        buildConnection({ from: 'a', to: 'b' }),
        buildConnection({ from: 'b', to: 'c' }),
      ],
    })

    const graph = layout(doc)

    const a = findNode(graph, 'a')!
    const b = findNode(graph, 'b')!
    const c = findNode(graph, 'c')!

    expect(a.depth).toBe(0)
    expect(b.depth).toBe(1)
    expect(c.depth).toBe(2)

    // Deeper nodes must have a higher y coordinate (further down).
    expect(a.y).toBeLessThan(b.y)
    expect(b.y).toBeLessThan(c.y)
  })

  it('normalises all positions to positive coordinates', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'a', name: 'A' }), buildDevice({ id: 'b', name: 'B' })],
    })

    const graph = layout(doc)

    for (const node of graph.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeGreaterThanOrEqual(0)
    }
  })

  it('gives all nodes uniform dimensions regardless of content', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({ id: 'bare', name: 'Bare' }),
        {
          id: 'loaded',
          name: 'Loaded Server',
          type: 'hypervisor',
          children: [
            { id: 'vm-1', name: 'VM 1', type: 'vm' },
            { id: 'vm-2', name: 'VM 2', type: 'vm' },
          ],
          services: [
            { name: 'nginx', port: 80 },
            { name: 'postgres', port: 5432 },
          ],
        },
      ],
    })

    const graph = layout(doc)

    const widths = new Set(graph.nodes.map((n) => n.width))
    const heights = new Set(graph.nodes.map((n) => n.height))

    expect(widths.size).toBe(1)
    expect(heights.size).toBe(1)
    expect(graph.nodes[0].width).toBe(DEFAULT_LAYOUT_OPTIONS.nodeWidth)
    expect(graph.nodes[0].height).toBe(DEFAULT_LAYOUT_OPTIONS.nodeHeight)
  })
})

// ─── Connection rerouting ─────────────────────────────────────────
// Children are rendered inside parent cards, not as separate graph
// nodes. Any connection referencing a child is rerouted to its parent.

describe('layout › connection rerouting', () => {
  it('only positions top-level devices as graph nodes, not children', () => {
    const doc = buildDocWithChildren()
    const graph = layout(doc)

    const ids = graph.nodes.map((n) => n.device.id)
    expect(ids).toContain('hypervisor')
    expect(ids).toContain('switch')
    expect(ids).not.toContain('vm-1')
    expect(ids).not.toContain('vm-2')
  })

  it('reroutes connections targeting child devices to the parent', () => {
    const doc: HomelabDocument = {
      meta: { title: 'Reroute test' },
      devices: [
        {
          id: 'parent',
          name: 'Parent',
          type: 'hypervisor',
          children: [{ id: 'child', name: 'Child', type: 'vm' }],
        },
        buildDevice({ id: 'ext', name: 'External', type: 'switch' }),
      ],
      connections: [
        buildConnection({ from: 'child', to: 'ext' }),
        buildConnection({ from: 'parent', to: 'ext' }),
      ],
    }

    const graph = layout(doc)

    // After rerouting and dedup, only one edge parent→ext should survive.
    const edgePairs = graph.edges.map((e) => `${e.fromNodeId}→${e.toNodeId}`)
    expect(edgePairs).toContain('parent→ext')
    expect(edgePairs).not.toContain('child→ext')

    // Deduplication: shouldn't have two parent→ext edges.
    const parentToExt = graph.edges.filter((e) => e.fromNodeId === 'parent' && e.toNodeId === 'ext')
    expect(parentToExt).toHaveLength(1)
  })

  it('eliminates self-connections created by rerouting', () => {
    const doc: HomelabDocument = {
      meta: { title: 'Self-loop test' },
      devices: [
        {
          id: 'host',
          name: 'Host',
          type: 'hypervisor',
          children: [{ id: 'vm', name: 'VM', type: 'vm' }],
        },
      ],
      // vm → host reroutes to host → host → eliminated.
      connections: [buildConnection({ from: 'vm', to: 'host' })],
    }

    const graph = layout(doc)

    const selfEdges = graph.edges.filter((e) => e.fromNodeId === e.toNodeId)
    expect(selfEdges).toHaveLength(0)
  })

  it('deduplicates rerouted connections that produce the same pair', () => {
    const doc: HomelabDocument = {
      meta: { title: 'Dedup test' },
      devices: [
        {
          id: 'host',
          name: 'Host',
          type: 'hypervisor',
          children: [
            { id: 'vm-a', name: 'VM A', type: 'vm' },
            { id: 'vm-b', name: 'VM B', type: 'vm' },
          ],
        },
        buildDevice({ id: 'sw', name: 'Switch', type: 'switch' }),
      ],
      // Both child connections reroute to host→sw.
      connections: [
        buildConnection({ from: 'vm-a', to: 'sw' }),
        buildConnection({ from: 'vm-b', to: 'sw' }),
        buildConnection({ from: 'host', to: 'sw' }),
      ],
    }

    const graph = layout(doc)

    const hostToSw = graph.edges.filter((e) => e.fromNodeId === 'host' && e.toNodeId === 'sw')
    expect(hostToSw).toHaveLength(1)
  })
})

// ─── Groups ───────────────────────────────────────────────────────

describe('layout › groups', () => {
  it('computes a bounding box around member devices', () => {
    const doc = buildDoc({
      groups: [{ id: 'rack', name: 'Server Rack' }],
      devices: [
        buildDevice({ id: 'a', name: 'A', group: 'rack' }),
        buildDevice({ id: 'b', name: 'B', group: 'rack' }),
      ],
    })

    const graph = layout(doc)

    expect(graph.groups).toHaveLength(1)
    const group = graph.groups[0]

    const a = findNode(graph, 'a')!
    const b = findNode(graph, 'b')!

    const pad = DEFAULT_LAYOUT_OPTIONS.groupPadding

    // Group box should contain both nodes with padding.
    expect(group.x).toBeLessThanOrEqual(a.x - pad)
    expect(group.y).toBeLessThanOrEqual(a.y - pad)
    expect(group.x + group.width).toBeGreaterThanOrEqual(b.x + b.width + pad)
    expect(group.y + group.height).toBeGreaterThanOrEqual(b.y + b.height + pad)
  })

  it('filters out groups with no member devices', () => {
    const doc = buildDoc({
      groups: [
        { id: 'populated', name: 'Has members' },
        { id: 'empty', name: 'No members' },
      ],
      devices: [buildDevice({ id: 'srv', name: 'Server', group: 'populated' })],
    })

    const graph = layout(doc)

    expect(graph.groups).toHaveLength(1)
    expect(graph.groups[0].group.id).toBe('populated')
  })

  it('applies group padding correctly', () => {
    const customPadding = 20
    const doc = buildDoc({
      groups: [{ id: 'g', name: 'G' }],
      devices: [buildDevice({ id: 'only', name: 'Only', group: 'g' })],
    })

    const graph = layout(doc, { groupPadding: customPadding })

    const node = findNode(graph, 'only')!
    const group = graph.groups[0]

    // For a single-node group:
    //   width  = nodeWidth + 2 * padding  (symmetric left/right)
    //   height = nodeHeight + padding + (padding + 16)  (extra 16 at top for label)
    expect(group.width).toBe(node.width + customPadding * 2)
    expect(group.height).toBe(node.height + customPadding * 2 + 16)
  })

  it('adds extra horizontal spacing between nodes in different groups', () => {
    // Two nodes in DIFFERENT groups — should get extra spacing.
    const diffGroupDoc = buildDoc({
      groups: [
        { id: 'left-group', name: 'Left' },
        { id: 'right-group', name: 'Right' },
      ],
      devices: [
        buildDevice({ id: 'a', name: 'A', group: 'left-group' }),
        buildDevice({ id: 'b', name: 'B', group: 'right-group' }),
      ],
    })
    const diffLayout = layout(diffGroupDoc)

    // Two nodes in the SAME group — baseline spacing.
    const sameGroupDoc = buildDoc({
      groups: [{ id: 'shared', name: 'Shared' }],
      devices: [
        buildDevice({ id: 'a', name: 'A', group: 'shared' }),
        buildDevice({ id: 'b', name: 'B', group: 'shared' }),
      ],
    })
    const sameLayout = layout(sameGroupDoc)

    const diffGap =
      findNode(diffLayout, 'b')!.x -
      (findNode(diffLayout, 'a')!.x + findNode(diffLayout, 'a')!.width)
    const sameGap =
      findNode(sameLayout, 'b')!.x -
      (findNode(sameLayout, 'a')!.x + findNode(sameLayout, 'a')!.width)

    // Nodes in different groups should be spaced further apart than
    // nodes sharing a group.
    expect(diffGap).toBeGreaterThan(sameGap)
  })
})

// ─── Edges ────────────────────────────────────────────────────────

describe('layout › edges', () => {
  it('produces a 2-point (straight) edge for vertically aligned nodes', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({ id: 'top', name: 'Top' }),
        buildDevice({ id: 'bottom', name: 'Bottom' }),
      ],
      connections: [buildConnection({ from: 'top', to: 'bottom' })],
    })

    const graph = layout(doc)

    // A single connection between two nodes in a chain means they're in
    // separate layers, centred, so their x midpoints should align.
    const edge = findEdge(graph, 'top', 'bottom')
    expect(edge).toBeDefined()
    expect(edge!.points).toHaveLength(2)
  })

  it('produces a 4-point (Manhattan) edge for horizontally offset nodes', () => {
    // Three devices in layer 0, but only one in layer 1, plus a lateral
    // connection from a layer-0 sibling to the layer-1 device creates
    // an offset edge.
    const doc = buildDoc({
      devices: [
        buildDevice({ id: 'root', name: 'Root' }),
        buildDevice({ id: 'left', name: 'Left' }),
        buildDevice({ id: 'right', name: 'Right' }),
      ],
      connections: [
        buildConnection({ from: 'root', to: 'left' }),
        buildConnection({ from: 'root', to: 'right' }),
      ],
    })

    const graph = layout(doc)

    // root is depth 0, left and right are depth 1. If left and right are
    // side-by-side, at least one of the two edges should be offset (4 points).
    const manhattanEdges = graph.edges.filter((e) => e.points.length === 4)
    expect(manhattanEdges.length).toBeGreaterThanOrEqual(1)
  })

  it('filters out edges referencing non-existent nodes', () => {
    const doc = buildDoc({
      connections: [buildConnection({ from: 'router', to: 'ghost' })],
    })

    // "ghost" has no device entry, so it won't be in the nodeMap.
    // The edge router should still produce a graph but drop the bad edge.
    const graph = layout(doc)

    const ghostEdge = findEdge(graph, 'router', 'ghost')
    expect(ghostEdge).toBeUndefined()
  })
})

// ─── Bounds ───────────────────────────────────────────────────────

describe('layout › bounds', () => {
  it('encompasses all nodes', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'a', name: 'A' }), buildDevice({ id: 'b', name: 'B' })],
    })

    const graph = layout(doc)

    for (const node of graph.nodes) {
      expect(node.x + node.width).toBeLessThanOrEqual(graph.bounds.width)
      expect(node.y + node.height).toBeLessThanOrEqual(graph.bounds.height)
    }
  })

  it('encompasses all groups', () => {
    const doc = buildDoc({
      groups: [{ id: 'g', name: 'G' }],
      devices: [buildDevice({ id: 'srv', name: 'S', group: 'g' })],
    })

    const graph = layout(doc)

    for (const group of graph.groups) {
      expect(group.x + group.width).toBeLessThanOrEqual(graph.bounds.width)
      expect(group.y + group.height).toBeLessThanOrEqual(graph.bounds.height)
    }
  })

  it('includes padding beyond outermost elements', () => {
    const doc = buildDoc()
    const graph = layout(doc)
    const node = graph.nodes[0]

    // Bounds should extend past the node by at least groupPadding * 2.
    const pad = DEFAULT_LAYOUT_OPTIONS.groupPadding * 2
    expect(graph.bounds.width).toBeGreaterThanOrEqual(node.x + node.width + pad)
    expect(graph.bounds.height).toBeGreaterThanOrEqual(node.y + node.height + pad)
  })
})

// ─── Options ──────────────────────────────────────────────────────

describe('layout › options', () => {
  it('uses default options when none are provided', () => {
    const doc = buildDoc()
    const graph = layout(doc)

    const node = graph.nodes[0]
    expect(node.width).toBe(DEFAULT_LAYOUT_OPTIONS.nodeWidth)
    expect(node.height).toBe(DEFAULT_LAYOUT_OPTIONS.nodeHeight)
  })

  it('allows user options to override defaults', () => {
    const doc = buildDoc()
    const graph = layout(doc, { nodeWidth: 400, nodeHeight: 200 })

    const node = graph.nodes[0]
    expect(node.width).toBe(400)
    expect(node.height).toBe(200)
  })

  it('respects custom spacing between nodes', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'a', name: 'A' }), buildDevice({ id: 'b', name: 'B' })],
    })

    const narrow = layout(doc, { horizontalSpacing: 20 })
    const wide = layout(doc, { horizontalSpacing: 200 })

    const narrowGap =
      findNode(narrow, 'b')!.x - (findNode(narrow, 'a')!.x + findNode(narrow, 'a')!.width)
    const wideGap = findNode(wide, 'b')!.x - (findNode(wide, 'a')!.x + findNode(wide, 'a')!.width)

    expect(wideGap).toBeGreaterThan(narrowGap)
  })
})

// ─── Meta passthrough ─────────────────────────────────────────────

describe('layout › meta', () => {
  it('passes the document meta through to the output graph', () => {
    const doc = buildDoc({ meta: { title: 'My Homelab' } })
    const graph = layout(doc)

    expect(graph.meta.title).toBe('My Homelab')
  })
})
