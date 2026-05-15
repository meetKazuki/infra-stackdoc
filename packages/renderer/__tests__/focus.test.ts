import { describe, it, expect } from 'vitest'
import { buildEdge } from './fixtures'
import { computeFocusedNodeIds, computeFocusedEdgeKeys } from '../src/lib/focus'

describe('computeFocusedNodeIds', () => {
  it('returns only the focused node at depth 0', () => {
    const edges = [buildEdge('a', 'b'), buildEdge('b', 'c')]

    const result = computeFocusedNodeIds('a', 0, edges)

    expect(result).toEqual(new Set(['a']))
  })

  it('returns 1-hop neighbours at depth 1', () => {
    // a — b — c — d, plus a — e (a has two direct neighbours)
    const edges = [
      buildEdge('a', 'b'),
      buildEdge('b', 'c'),
      buildEdge('c', 'd'),
      buildEdge('a', 'e'),
    ]

    const result = computeFocusedNodeIds('a', 1, edges)

    expect(result).toEqual(new Set(['a', 'b', 'e']))
  })

  it('returns 2-hop neighbours at depth 2', () => {
    // a — b — c — d
    const edges = [buildEdge('a', 'b'), buildEdge('b', 'c'), buildEdge('c', 'd')]

    const result = computeFocusedNodeIds('a', 2, edges)

    expect(result).toEqual(new Set(['a', 'b', 'c']))
  })

  it('treats edges as undirected (matches regardless of from/to ordering)', () => {
    // Build the same graph as the 1-hop test but with edge directions flipped.
    const edges = [buildEdge('b', 'a'), buildEdge('e', 'a')]

    const result = computeFocusedNodeIds('a', 1, edges)

    expect(result).toEqual(new Set(['a', 'b', 'e']))
  })

  it('handles a disconnected graph by ignoring unreachable nodes', () => {
    // Two disconnected components: {a, b} and {x, y}
    const edges = [buildEdge('a', 'b'), buildEdge('x', 'y')]

    const result = computeFocusedNodeIds('a', 2, edges)

    expect(result).toEqual(new Set(['a', 'b']))
    expect(result.has('x')).toBe(false)
  })

  it('handles a cycle without infinite-looping', () => {
    // a — b — c — a (triangle)
    const edges = [buildEdge('a', 'b'), buildEdge('b', 'c'), buildEdge('c', 'a')]

    const result = computeFocusedNodeIds('a', 1, edges)

    expect(result).toEqual(new Set(['a', 'b', 'c']))
  })

  it('returns only the focused id when it has no edges (isolated node)', () => {
    const edges = [buildEdge('x', 'y')]

    const result = computeFocusedNodeIds('a', 2, edges)

    expect(result).toEqual(new Set(['a']))
  })
})

describe('computeFocusedEdgeKeys', () => {
  it('includes edges where both endpoints are in the focused set', () => {
    const edges = [buildEdge('a', 'b'), buildEdge('b', 'c'), buildEdge('c', 'd')]
    const focused = new Set(['a', 'b', 'c'])

    const result = computeFocusedEdgeKeys(focused, edges, (e) => `${e.fromNodeId}→${e.toNodeId}`)

    expect(result).toEqual(new Set(['a→b', 'b→c']))
  })

  it('excludes edges where only one endpoint is focused', () => {
    const edges = [buildEdge('a', 'b'), buildEdge('a', 'z')]
    const focused = new Set(['a', 'b'])

    const result = computeFocusedEdgeKeys(focused, edges, (e) => `${e.fromNodeId}→${e.toNodeId}`)

    expect(result).toEqual(new Set(['a→b']))
  })
})
