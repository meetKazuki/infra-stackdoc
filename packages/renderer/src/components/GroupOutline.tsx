import React from "react";
import { colors, fonts } from "../theme";
import type { PositionedGroup } from "@homelab-stackdoc/core";

interface GroupOutlineProps {
  group: PositionedGroup;
}

export const GroupOutline: React.FC<GroupOutlineProps> = ({ group }) => {
  const { x, y, width, height } = group;
  const style = group.group.style ?? "dashed";
  const accentColor = group.group.color ?? colors.primary;

  if (style === "none") return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        ry={8}
        fill={`${accentColor}06`}
        stroke={accentColor}
        strokeWidth={1}
        strokeOpacity={0.3}
        strokeDasharray={style === "dashed" ? "8 4" : "none"}
      />
      {/* Group label — positioned at the top edge */}
      <text
        x={x + 12}
        y={y - 6}
        fill={accentColor}
        fontSize={10}
        fontFamily={fonts.mono}
        fontWeight={700}
        letterSpacing="0.1em"
        style={{ textTransform: "uppercase" }}
        opacity={0.7}
      >
        {group.group.name.toUpperCase()}
      </text>
    </g>
  );
};
