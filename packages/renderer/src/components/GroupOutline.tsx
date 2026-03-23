import React from "react";
import type { PositionedGroup } from "@homelab-stackdoc/core";
import { colors, fonts } from "../theme";

interface GroupOutlineProps {
  group: PositionedGroup;
}

export const GroupOutline: React.FC<GroupOutlineProps> = ({ group }) => {
  const { x, y, width, height } = group;
  const style = group.group.style ?? "dashed";
  const accentColor = group.group.color ?? colors.primary;

  if (style === "none") return null;

  const label = group.group.name.toUpperCase();
  const labelFontSize = 9;
  const labelPadX = 8;
  const labelPadY = 3;
  const labelX = x + 12;
  const labelY = y + 16;

  // Approximate label width (monospace ~5.5px per char at 9px font)
  const approxLabelWidth = label.length * 5.5 + labelPadX * 2;

  return (
    <g>
      {/* Background fill */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        ry={8}
        fill={`${accentColor}04`}
        stroke="none"
      />

      {/* Border */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        ry={8}
        fill="none"
        stroke={accentColor}
        strokeWidth={1}
        strokeOpacity={0.2}
        strokeDasharray={style === "dashed" ? "6 4" : "none"}
      />

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
        letterSpacing="0.08em"
        opacity={0.8}
      >
        {label}
      </text>
    </g>
  );
};
