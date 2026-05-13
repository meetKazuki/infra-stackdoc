import React from 'react'
import { colors, fonts } from '../theme'
import type { PositionedGroup } from '@homelab-stackdoc/core'

interface GroupOutlineProps {
  group: PositionedGroup
}

/**
 * Per-depth visual cues for nested (subgroup) outlines.
 *
 * Mirrors the table in `Design Direction.html` § 8.1. Depths ≥ 2
 * reuse the depth-2 treatment (a deliberate decision — automatic
 * level-of-detail handling for deeper nests is Phase 2c's job).
 */
const DEPTH_STYLES = {
  0: {
    border: 'dashed' as const,
    borderOpacityHex: '55',
    fillRgba: 'transparent',
    fontSize: 10,
    letterSpacing: '0.14em',
    cornerRadius: 8,
  },
  1: {
    border: 'dashed' as const,
    borderOpacityHex: '44',
    fillRgba: 'rgba(0,0,0,0.18)',
    fontSize: 9,
    letterSpacing: '0.10em',
    cornerRadius: 6,
  },
  2: {
    border: 'solid' as const,
    borderOpacityHex: '33',
    fillRgba: 'rgba(0,0,0,0.30)',
    fontSize: 8,
    letterSpacing: '0.10em',
    cornerRadius: 4,
  },
} as const

function styleForDepth(depth: number) {
  if (depth <= 0) return DEPTH_STYLES[0]
  if (depth === 1) return DEPTH_STYLES[1]
  return DEPTH_STYLES[2]
}

/**
 * Returns the depth-marker prefix shown before the group label.
 * Depth 0 → '─', depth 1 → '──', depth N → (N+1) repetitions.
 */
function depthPrefix(depth: number): string {
  return '─'.repeat(Math.max(0, depth) + 1)
}

export const GroupOutline: React.FC<GroupOutlineProps> = ({ group }) => {
  const { x, y, width, height } = group
  const depth = group.depth ?? 0
  const accentColor = group.group.color ?? colors.primary

  // Explicit `style` on the group still overrides the depth-derived
  // border treatment. `style: none` hides the outline entirely.
  // This precedence is intentional — config wins over auto-styling.
  const explicitStyle = group.group.style
  if (explicitStyle === 'none') return null

  const cue = styleForDepth(depth)
  const borderKind = explicitStyle ?? cue.border

  // Hide label when name is empty (used by the layout engine to
  // suppress labels on extra clusters of a split group).
  const hasLabel = group.group.name.length > 0
  const label = hasLabel ? `${depthPrefix(depth)} ${group.group.name.toUpperCase()}` : ''

  const labelFontSize = cue.fontSize
  const labelPadX = 8
  const labelPadY = 3
  const labelX = x + 12
  const labelY = y + 16

  // Approximate label width (monospace ~5.5px per char at base 9px).
  // Scales linearly with font size to stay roughly correct at depth.
  const charWidth = (labelFontSize / 9) * 5.5
  const approxLabelWidth = label.length * charWidth + labelPadX * 2

  return (
    <g>
      {/* Background fill — depth-tinted to make nesting read */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={cue.cornerRadius}
        ry={cue.cornerRadius}
        fill={cue.fillRgba === 'transparent' ? `${accentColor}04` : cue.fillRgba}
        stroke="none"
      />

      {/* Border */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={cue.cornerRadius}
        ry={cue.cornerRadius}
        fill="none"
        stroke={`${accentColor}${cue.borderOpacityHex}`}
        strokeWidth={1}
        strokeDasharray={borderKind === 'dashed' ? '6 4' : 'none'}
      />

      {hasLabel && (
        <>
          {/* Label background pill */}
          <rect
            x={labelX - labelPadX}
            y={labelY - labelFontSize - labelPadY + 1}
            width={approxLabelWidth}
            height={labelFontSize + labelPadY * 2}
            rx={3}
            ry={3}
            fill={colors.background}
            fillOpacity={0.9}
          />

          {/* Label text */}
          <text
            x={labelX}
            y={labelY}
            fill={accentColor}
            fontSize={labelFontSize}
            fontFamily={fonts.mono}
            fontWeight={700}
            letterSpacing={cue.letterSpacing}
            opacity={0.8}
          >
            {label}
          </text>
        </>
      )}
    </g>
  )
}
