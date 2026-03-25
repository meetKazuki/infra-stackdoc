import React, { useState } from 'react'
import { colors, fonts } from '../theme'
import type { DeviceInterfaces } from '@homelab-stackdoc/core'
import type { PortAssignment } from '@homelab-stackdoc/core'

interface PortStripProps {
  interfaces: DeviceInterfaces
  assignments: PortAssignment[]
  cardWidth: number
  onPortHover?: (connectedTo: string | null) => void
}

const PORT_W = 18
const PORT_H = 16
const PORT_GAP = 3

const RJ45Port: React.FC<{
  active: boolean
  connectedTo?: string
  speed?: string
  index: number
  onHover?: (connectedTo: string | null) => void
}> = ({ active, connectedTo, speed, index, onHover }) => {
  const [hovered, setHovered] = useState(false)
  const activeColor = colors.green

  const handleEnter = () => {
    setHovered(true)
    if (active && connectedTo && onHover) onHover(connectedTo)
  }

  const handleLeave = () => {
    setHovered(false)
    if (onHover) onHover(null)
  }

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{ position: 'relative', cursor: active ? 'pointer' : 'default' }}
    >
      <svg
        width={PORT_W}
        height={PORT_H}
        viewBox="0 0 18 16"
        style={{
          filter: hovered && active ? `drop-shadow(0 0 6px ${activeColor})` : 'none',
          transition: 'filter 0.15s',
        }}
      >
        {/* RJ45 housing */}
        <rect
          x={1}
          y={4}
          width={16}
          height={11}
          rx={1.5}
          fill={active ? `${activeColor}20` : '#1a2332'}
          stroke={active ? (hovered ? activeColor : `${activeColor}66`) : 'rgba(0,229,255,0.08)'}
          strokeWidth={hovered && active ? 1.5 : 1}
        />
        {/* Top clip/latch */}
        <rect
          x={5}
          y={1}
          width={8}
          height={4}
          rx={1}
          fill={active ? `${activeColor}30` : '#1a2332'}
          stroke={active ? `${activeColor}44` : 'rgba(0,229,255,0.06)'}
          strokeWidth={0.75}
        />
        {/* Latch notch */}
        <rect
          x={7}
          y={0}
          width={4}
          height={2}
          rx={0.5}
          fill={active ? `${activeColor}40` : '#151e2d'}
          stroke="none"
        />
        {/* Pin contacts (4 pins) */}
        {[5, 7.5, 10, 12.5].map((px, i) => (
          <rect
            key={i}
            x={px}
            y={6}
            width={1}
            height={4}
            rx={0.25}
            fill={active ? `${activeColor}60` : 'rgba(0,229,255,0.06)'}
          />
        ))}
        {/* Active LED indicator */}
        {active && (
          <>
            <circle cx={9} cy={12} r={1.5} fill={activeColor} opacity={hovered ? 1 : 0.7} />
            {hovered && <circle cx={9} cy={12} r={3} fill={activeColor} opacity={0.15} />}
          </>
        )}
      </svg>

      {/* Port number */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 6,
          color: active ? colors.textSecondary : colors.textMuted,
          marginTop: 1,
          fontFamily: fonts.mono,
        }}
      >
        {index + 1}
      </div>

      {/* Tooltip — rendered below the port to avoid clipping */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: PORT_H + 14,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0a1020',
            border: `1px solid ${active ? `${activeColor}55` : colors.border}`,
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 10,
            color: active ? colors.textPrimary : colors.textMuted,
            whiteSpace: 'nowrap',
            zIndex: 200,
            fontFamily: fonts.mono,
            pointerEvents: 'none',
            boxShadow: active ? `0 0 12px ${activeColor}22` : 'none',
          }}
        >
          {active
            ? `Port ${index + 1} → ${connectedTo}${speed ? ` (${speed})` : ''}`
            : `Port ${index + 1} · Empty`}
        </div>
      )}
    </div>
  )
}

const WifiIndicator: React.FC<{
  clientCount: number
  bands?: string[]
  assignments: PortAssignment[]
  onHover?: (connectedTo: string | null) => void
}> = ({ clientCount, bands, assignments, onHover }) => {
  const [hovered, setHovered] = useState(false)
  const active = clientCount > 0

  const handleEnter = () => {
    setHovered(true)
    // Highlight all wifi connections
    if (active && onHover && assignments.length > 0) {
      onHover(assignments[0].connectedTo)
    }
  }

  const handleLeave = () => {
    setHovered(false)
    if (onHover) onHover(null)
  }

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        position: 'relative',
        cursor: active ? 'pointer' : 'default',
      }}
    >
      <svg
        width={18}
        height={16}
        viewBox="0 0 24 24"
        fill={active ? colors.primary : colors.textMuted}
        style={{
          opacity: active ? (hovered ? 1 : 0.8) : 0.3,
          filter: hovered && active ? `drop-shadow(0 0 6px ${colors.primary})` : 'none',
          transition: 'filter 0.15s, opacity 0.15s',
        }}
      >
        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
      </svg>
      {active && (
        <span
          style={{
            fontSize: 9,
            color: hovered ? colors.primary : `${colors.primary}bb`,
            fontWeight: 600,
            fontFamily: fonts.mono,
            transition: 'color 0.15s',
          }}
        >
          {clientCount}
        </span>
      )}

      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: 22,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0a1020',
            border: `1px solid ${colors.primary}44`,
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 10,
            color: colors.textPrimary,
            whiteSpace: 'nowrap',
            zIndex: 200,
            fontFamily: fonts.mono,
            pointerEvents: 'none',
            boxShadow: `0 0 12px ${colors.primary}22`,
          }}
        >
          <div>
            WiFi · {clientCount} client{clientCount !== 1 ? 's' : ''}
          </div>
          {bands && bands.length > 0 && (
            <div style={{ color: colors.textMuted, fontSize: 9 }}>{bands.join(' / ')}</div>
          )}
          {assignments.length > 0 && (
            <div style={{ marginTop: 2, borderTop: `1px solid ${colors.border}`, paddingTop: 2 }}>
              {assignments.map((a, i) => (
                <div key={i} style={{ fontSize: 9, color: colors.textSecondary }}>
                  → {a.connectedTo}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const PortStrip: React.FC<PortStripProps> = ({
  interfaces,
  assignments,
  cardWidth: _cardWidth,
  onPortHover,
}) => {
  const ethCount = interfaces.ethernet?.count ?? 0
  const sfpCount = interfaces.sfp?.count ?? 0
  const hasWifi = !!interfaces.wifi

  const ethAssignments = assignments.filter((a) => a.interfaceType === 'ethernet')
  const sfpAssignments = assignments.filter((a) => a.interfaceType === 'sfp')
  const wifiAssignments = assignments.filter((a) => a.interfaceType === 'wifi')

  if (ethCount === 0 && sfpCount === 0 && !hasWifi) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        paddingTop: 5,
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      {/* Ethernet ports */}
      {ethCount > 0 && (
        <div>
          <div style={{ display: 'flex', gap: PORT_GAP }}>
            {Array.from({ length: ethCount }, (_, i) => {
              const assignment = ethAssignments.find((a) => a.portIndex === i)
              return (
                <RJ45Port
                  key={`eth-${i}`}
                  index={i}
                  active={!!assignment}
                  connectedTo={assignment?.connectedTo}
                  speed={assignment?.speed}
                  onHover={onPortHover}
                />
              )
            })}
          </div>
          <div
            style={{
              fontSize: 7,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: 2,
            }}
          >
            {interfaces.ethernet?.speed ? `${interfaces.ethernet.speed} ETH` : 'ETHERNET'}
          </div>
        </div>
      )}

      {/* SFP ports */}
      {sfpCount > 0 && (
        <div>
          <div style={{ display: 'flex', gap: PORT_GAP }}>
            {Array.from({ length: sfpCount }, (_, i) => {
              const assignment = sfpAssignments.find((a) => a.portIndex === i)
              return (
                <RJ45Port
                  key={`sfp-${i}`}
                  index={i}
                  active={!!assignment}
                  connectedTo={assignment?.connectedTo}
                  speed={assignment?.speed}
                  onHover={onPortHover}
                />
              )
            })}
          </div>
          <div
            style={{
              fontSize: 7,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: 2,
            }}
          >
            {interfaces.sfp?.speed ? `${interfaces.sfp.speed} SFP` : 'SFP'}
          </div>
        </div>
      )}

      {/* WiFi indicator */}
      {hasWifi && (
        <div>
          <WifiIndicator
            clientCount={wifiAssignments.length}
            bands={interfaces.wifi?.bands}
            assignments={wifiAssignments}
            onHover={onPortHover}
          />
          <div
            style={{
              fontSize: 7,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: 2,
            }}
          >
            WIFI
          </div>
        </div>
      )}
    </div>
  )
}
