import React from "react";
import { connectionColors, colors } from "../theme";
import type { PositionedEdge } from "@homelab-stackdoc/core";

interface ConnectionLineProps {
  edge: PositionedEdge;
}

// Unique ID counter for SVG gradient/animation references
let idCounter = 0;

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ edge }) => {
  const { connection, points } = edge;
  if (points.length < 2) return null;

  const connType = connection.type ?? "default";
  const color = connectionColors[connType] ?? connectionColors.default;
  const isVpn = connType === "vpn";
  const isWifi = connType === "wifi";
  const animId = `flow-${idCounter++}`;

  // Build SVG path
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Compute total path length for animation
  const totalLength = points.reduce((sum, p, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    return sum + Math.hypot(p.x - prev.x, p.y - prev.y);
  }, 0);

  // Animation speed: pixels per second
  const speed = 60;
  const duration = Math.max(1, totalLength / speed);

  // Dash pattern for the animated "particle" layer
  const particleGap = 24;
  const particleDot = 6;

  return (
    <g>
      {/* Glow layer */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeOpacity={0.06}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Base line — static, subtle */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isVpn ? "6 4" : isWifi ? "2 4" : "none"}
      />

      {/* Animated flow layer — marching dots show direction */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${particleDot} ${particleGap}`}
      >
        <animate
          attributeName="stroke-dashoffset"
          from={`${particleDot + particleGap}`}
          to="0"
          dur={`${duration}s`}
          repeatCount="indefinite"
        />
      </path>

      {/* Endpoint dots */}
      <circle
        cx={points[0].x}
        cy={points[0].y}
        r={2.5}
        fill={color}
        opacity={0.4}
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2.5}
        fill={color}
        opacity={0.4}
      />

      {/* Speed / label */}
      {(connection.speed || connection.label) && points.length >= 2 && (() => {
        const mid = points.length >= 4
          ? { x: (points[1].x + points[2].x) / 2, y: (points[1].y + points[2].y) / 2 }
          : { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
        return (
          <g>
            <rect
              x={mid.x - 18}
              y={mid.y - 8}
              width={36}
              height={14}
              rx={3}
              fill={colors.background}
              fillOpacity={0.85}
            />
            <text
              x={mid.x}
              y={mid.y + 3}
              textAnchor="middle"
              fill={colors.textMuted}
              fontSize={8}
              fontFamily="'JetBrains Mono', monospace"
              fontWeight={600}
            >
              {connection.label ?? connection.speed}
            </text>
          </g>
        );
      })()}
    </g>
  );
};
