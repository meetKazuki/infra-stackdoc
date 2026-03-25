import React, { useRef, useState, useCallback, useEffect } from 'react'
import { CanvasControls } from './CanvasControls'
import { colors, fonts } from '../theme'
import { ConnectionLine } from './ConnectionLine'
import { DetailModal } from './DetailModal'
import { DeviceCard } from './DeviceCard'
import { GroupOutline } from './GroupOutline'
import type { PositionedGraph, Device, Connection } from '@homelab-stackdoc/core'

interface TopologyCanvasProps {
  graph: PositionedGraph
  deviceMap: Map<string, Device>
  connections: Connection[]
}

interface Transform {
  x: number
  y: number
  scale: number
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  graph,
  deviceMap,
  connections,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  const [modalChild, setModalChild] = useState<Device | null>(null)
  const [modalParent, setModalParent] = useState<Device | null>(null)

  const [highlightedEdge, setHighlightedEdge] = useState<{ from: string; to: string } | null>(null)

  const handleChildClick = useCallback((child: Device, parent: Device) => {
    setModalChild(child)
    setModalParent(parent)
  }, [])

  const closeModal = useCallback(() => {
    setModalChild(null)
    setModalParent(null)
  }, [])

  const handlePortHover = useCallback((deviceId: string, connectedTo: string | null) => {
    if (connectedTo) {
      setHighlightedEdge({ from: deviceId, to: connectedTo })
    } else {
      setHighlightedEdge(null)
    }
  }, [])

  // Auto-fit on graph change
  useEffect(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const headerHeight = 44
    const padding = 40
    const availableWidth = rect.width - padding * 2
    const availableHeight = rect.height - headerHeight - padding * 2
    const scaleX = availableWidth / graph.bounds.width
    const scaleY = availableHeight / graph.bounds.height
    const scale = Math.min(scaleX, scaleY, 1)
    const scaledWidth = graph.bounds.width * scale
    const scaledHeight = graph.bounds.height * scale
    const x = (rect.width - scaledWidth) / 2
    const y = headerHeight + (availableHeight - scaledHeight) / 2 + padding
    setTransform({ x, y, scale })
  }, [graph])

  // Non-passive wheel zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.92 : 1.08
      setTransform((t) => {
        const newScale = Math.min(3, Math.max(0.15, t.scale * delta))
        const rect = el.getBoundingClientRect()
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        return {
          scale: newScale,
          x: cx - (cx - t.x) * (newScale / t.scale),
          y: cy - (cy - t.y) * (newScale / t.scale),
        }
      })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // Pan
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      setDragging(true)
      dragStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }
    },
    [transform],
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return
      setTransform((t) => ({
        ...t,
        x: dragStart.current.tx + (e.clientX - dragStart.current.x),
        y: dragStart.current.ty + (e.clientY - dragStart.current.y),
      }))
    },
    [dragging],
  )

  const onMouseUp = useCallback(() => setDragging(false), [])

  // Zoom controls
  const onZoomIn = useCallback(() => {
    setTransform((t) => ({ ...t, scale: Math.min(3, t.scale * 1.2) }))
  }, [])

  const onZoomOut = useCallback(() => {
    setTransform((t) => ({ ...t, scale: Math.max(0.15, t.scale / 1.2) }))
  }, [])

  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const headerHeight = 44
    const padding = 40
    const availableWidth = rect.width - padding * 2
    const availableHeight = rect.height - headerHeight - padding * 2
    const scaleX = availableWidth / graph.bounds.width
    const scaleY = availableHeight / graph.bounds.height
    const scale = Math.min(scaleX, scaleY, 1)
    const scaledWidth = graph.bounds.width * scale
    const scaledHeight = graph.bounds.height * scale
    const x = (rect.width - scaledWidth) / 2
    const y = headerHeight + (availableHeight - scaledHeight) / 2 + padding
    setTransform({ x, y, scale })
  }, [graph])

  const resetView = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (rect.width - graph.bounds.width) / 2
    setTransform({ x, y: 60, scale: 1 })
  }, [graph])

  const legend = [
    { label: 'ETHERNET', color: '#00e676', dash: '' },
    { label: 'WI-FI', color: '#00e5ff', dash: '2 4' },
    { label: 'VPN', color: '#ffab00', dash: '6 4' },
  ]

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: colors.background,
        cursor: dragging ? 'grabbing' : 'grab',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 12,
          background: 'rgba(8,15,30,0.88)',
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${colors.border}`,
          zIndex: 10,
          fontFamily: fonts.mono,
        }}
      >
        <span style={{ color: colors.textPrimary, fontWeight: 700, fontSize: 13 }}>
          {graph.meta.title}
        </span>
        {graph.meta.subtitle && (
          <span style={{ color: colors.textMuted, fontSize: 10 }}>{graph.meta.subtitle}</span>
        )}
        {(graph.meta.tags ?? []).map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: colors.green,
              background: colors.greenDim,
              borderRadius: 3,
              padding: '2px 8px',
            }}
          >
            {tag}
          </span>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {legend.map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width={24} height={4}>
                <line
                  x1={0}
                  y1={2}
                  x2={24}
                  y2={2}
                  stroke={l.color}
                  strokeWidth={1.5}
                  strokeDasharray={l.dash || 'none'}
                />
              </svg>
              <span
                style={{
                  fontSize: 8,
                  color: colors.textMuted,
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                {l.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <CanvasControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFitToScreen={fitToScreen}
        onResetView={resetView}
        scale={transform.scale}
      />

      {/* Canvas */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        <svg
          width={graph.bounds.width}
          height={graph.bounds.height}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          {graph.groups.map((g) => (
            <GroupOutline key={g.group.id} group={g} />
          ))}
          {graph.edges.map((edge, i) => {
            const isHighlighted = highlightedEdge
              ? (edge.fromNodeId === highlightedEdge.from &&
                  edge.toNodeId === highlightedEdge.to) ||
                (edge.fromNodeId === highlightedEdge.to && edge.toNodeId === highlightedEdge.from)
              : false
            return (
              <ConnectionLine
                key={i}
                edge={edge}
                highlighted={isHighlighted}
                dimmed={highlightedEdge !== null && !isHighlighted}
              />
            )
          })}
        </svg>
        {graph.nodes.map((node) => {
          const original = deviceMap.get(node.device.id)
          return (
            <DeviceCard
              key={node.device.id}
              node={node}
              originalDevice={original ?? node.device}
              onChildClick={handleChildClick}
              portAssignments={graph.portAssignments.get(node.device.id) ?? []}
              onPortHover={handlePortHover}
            />
          )
        })}
      </div>

      {/* Modal */}
      {modalChild && modalParent && (
        <DetailModal
          child={modalChild}
          parent={modalParent}
          connections={connections}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
